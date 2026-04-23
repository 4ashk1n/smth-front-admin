import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionIcon, Badge, Button, Card, Group, Pagination, ScrollArea, Select, Stack, Table, Text, TextInput, Title, Tooltip } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { IconArrowLeft, IconRefresh, IconSearch } from "@tabler/icons-react";
import type { ArticleMeta, ArticleStatus } from "@smth/shared";
import { useNavigate, useParams } from "react-router-dom";
import { getUserArticles } from "../shared/api";
import { formatDateTime } from "../shared/lib/formatDateTime";
import { getErrorMessage } from "../shared/lib/getErrorMessage";
import { statusColor, statusLabel } from "../shared/lib/status";

const PAGE_SIZE = 20;
const STATUS_FILTER_VALUES: Array<ArticleStatus> = ["published", "review", "draft", "archived"];

export function UserArticlesPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [items, setItems] = useState<ArticleMeta[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [debouncedSearch] = useDebouncedValue(search, 350);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await getUserArticles(userId, {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: (status as ArticleStatus | null) ?? undefined,
      });
      setItems(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      showNotification({
        color: "red",
        title: "Ошибка загрузки",
        message: getErrorMessage(error, "Не удалось получить статьи пользователя"),
      });
    } finally {
      setLoading(false);
    }
  }, [userId, page, debouncedSearch, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, userId]);

  if (!userId) {
    return (
      <Card withBorder>
        <Text c="red">Не передан userId</Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="end">
        <div>
          <Group gap="sm" align="center" mb={4}>
            <Button
              size="xs"
              variant="subtle"
              leftSection={<IconArrowLeft size={14} />}
              onClick={() => navigate("/users")}
            >
              К пользователям
            </Button>
          </Group>
          <Title order={2}>Статьи пользователя</Title>
          <Text c="dimmed" size="sm">userId: {userId}</Text>
        </div>
        <Group>
          <TextInput
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            placeholder="Поиск по заголовку"
            w={320}
          />
          <Select
            placeholder="Все статусы"
            value={status}
            onChange={setStatus}
            clearable
            w={180}
            data={STATUS_FILTER_VALUES.map((value) => ({ value, label: statusLabel(value) }))}
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
                <Table.Th>Статус</Table.Th>
                <Table.Th>Создана</Table.Th>
                <Table.Th>Обновлена</Table.Th>
                <Table.Th>Опубликована</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((article) => (
                <Table.Tr key={article.id}>
                  <Table.Td>
                    <Text fw={600} lineClamp={1}>{article.title || "(без заголовка)"}</Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>{article.id}</Text>
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
                    <Text size="sm">{formatDateTime(article.publishedAt)}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
              {!loading && items.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center" py="lg">Статьи не найдены</Text>
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

