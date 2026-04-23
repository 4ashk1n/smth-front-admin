import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionIcon, Badge, Button, Card, Group, Pagination, ScrollArea, Stack, Table, Text, TextInput, Title, Tooltip } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { useDebouncedValue } from "@mantine/hooks";
import { IconCheck, IconRefresh, IconSearch, IconX } from "@tabler/icons-react";
import type { ArticleMeta } from "@smth/shared";
import { useNavigate } from "react-router-dom";
import { approveArticle, getReviewArticles, rejectArticle } from "../shared/api";
import { formatDateTime } from "../shared/lib/formatDateTime";
import { getErrorMessage } from "../shared/lib/getErrorMessage";
import { statusColor, statusLabel } from "../shared/lib/status";

const PAGE_SIZE = 20;

export function ReviewQueuePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ArticleMeta[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 350);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getReviewArticles({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
      });
      setItems(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      showNotification({
        color: "red",
        title: "Ошибка загрузки",
        message: getErrorMessage(error, "Не удалось загрузить очередь ревью"),
      });
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const moderate = useCallback(async (articleId: string, action: "approve" | "reject") => {
    setProcessingId(articleId);
    try {
      if (action === "approve") {
        await approveArticle(articleId);
      } else {
        await rejectArticle(articleId);
      }

      showNotification({
        color: "teal",
        title: "Готово",
        message: action === "approve" ? "Статья опубликована" : "Статья возвращена в черновик",
      });
      await load();
    } catch (error) {
      showNotification({
        color: "red",
        title: "Ошибка модерации",
        message: getErrorMessage(error, "Операция не выполнена"),
      });
    } finally {
      setProcessingId(null);
    }
  }, [load]);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="end">
        <div>
          <Title order={2}>Очередь ревью</Title>
          <Text c="dimmed" size="sm">Статьи со статусом review</Text>
        </div>
        <Group>
          <TextInput
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            placeholder="Поиск по заголовку"
            w={360}
          />
          <Tooltip label="Обновить">
            <ActionIcon variant="default" size="lg" onClick={() => void load()} loading={loading}>
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Card radius="md" p={0} withBorder className="panel-card">
        <ScrollArea>
          <Table verticalSpacing="sm" horizontalSpacing="md" miw={1100}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Заголовок</Table.Th>
                <Table.Th>Автор</Table.Th>
                <Table.Th>Статус</Table.Th>
                <Table.Th>Создана</Table.Th>
                <Table.Th>Обновлена</Table.Th>
                <Table.Th style={{ width: 210 }}>Действия</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((article) => {
                const busy = processingId === article.id;
                return (
                  <Table.Tr key={article.id}>
                    <Table.Td style={{ cursor: "pointer" }} onClick={() => navigate(`/articles/${article.id}`)}>
                      <Text fw={600} lineClamp={1}>{article.title || "(без заголовка)"}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>{article.id}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text ff="monospace" size="sm">{article.authorId}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={statusColor(article.status)} variant="light">{statusLabel(article.status)}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDateTime(article.createdAt)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDateTime(article.updatedAt)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Button
                          leftSection={<IconCheck size={14} />}
                          color="teal"
                          size="xs"
                          loading={busy}
                          onClick={() => void moderate(article.id, "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          leftSection={<IconX size={14} />}
                          color="red"
                          variant="light"
                          size="xs"
                          loading={busy}
                          onClick={() => void moderate(article.id, "reject")}
                        >
                          Reject
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {!loading && items.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center" py="lg">Статьи для ревью не найдены</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>

      <Group justify="space-between">
        <Text size="sm" c="dimmed">Всего: {total}</Text>
        <Pagination value={page} onChange={setPage} total={totalPages} boundaries={2} siblings={1} />
      </Group>
    </Stack>
  );
}
