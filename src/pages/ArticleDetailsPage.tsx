import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Code,
  Divider,
  Grid,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconArrowLeft, IconCheck, IconTrash, IconX } from "@tabler/icons-react";
import type { Article, ArticleStatus, ReviewRemark } from "@smth/shared";
import { useNavigate, useParams } from "react-router-dom";
import {
  archiveArticle,
  approveArticle,
  deleteArticleRemark,
  getArticleById,
  getArticleRemarks,
  publishArchivedArticle,
  rejectArticle,
  upsertArticleRemark,
} from "../shared/api";
import { formatDateTime } from "../shared/lib/formatDateTime";
import { getErrorMessage } from "../shared/lib/getErrorMessage";
import { statusColor, statusLabel } from "../shared/lib/status";

type AnyRecord = Record<string, unknown>;

type TopicNode = {
  id: string;
  title: string;
  order: number;
};

type PageNode = {
  id: string;
  topicId: string;
  order: number;
};

type BlockNode = {
  id: string;
  pageId: string;
  type: string;
  order: number;
  layout: unknown;
  payload: AnyRecord;
};

function asRecord(value: unknown): AnyRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as AnyRecord;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseContentTree(content: unknown) {
  const root = asRecord(content);
  if (!root) {
    return { topics: [] as TopicNode[], pages: [] as PageNode[], blocks: [] as BlockNode[] };
  }

  const topicsRaw = Array.isArray(root.topics) ? root.topics : [];
  const pagesRaw = Array.isArray(root.pages) ? root.pages : [];
  const blocksRaw = Array.isArray(root.blocks) ? root.blocks : [];

  const topics = topicsRaw
    .map((item, idx) => {
      const rec = asRecord(item);
      if (!rec) return null;
      return {
        id: asString(rec.id, `topic_${idx}`),
        title: asString(rec.title, "Untitled topic"),
        order: asNumber(rec.order, idx + 1),
      };
    })
    .filter((item): item is TopicNode => item !== null)
    .sort((a, b) => a.order - b.order);

  const pages = pagesRaw
    .map((item, idx) => {
      const rec = asRecord(item);
      if (!rec) return null;
      return {
        id: asString(rec.id, `page_${idx}`),
        topicId: asString(rec.topicId),
        order: asNumber(rec.order, idx),
      };
    })
    .filter((item): item is PageNode => item !== null)
    .sort((a, b) => a.order - b.order);

  const blocks = blocksRaw
    .map((item, idx) => {
      const rec = asRecord(item);
      if (!rec) return null;
      const { id, pageId, type, order, layout, ...rest } = rec;

      return {
        id: asString(id, `block_${idx}`),
        pageId: asString(pageId),
        type: asString(type, "unknown"),
        order: asNumber(order, idx),
        layout,
        payload: rest,
      };
    })
    .filter((item): item is BlockNode => item !== null)
    .sort((a, b) => a.order - b.order);

  return { topics, pages, blocks };
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusBadge(status: ArticleStatus) {
  return (
    <Badge color={statusColor(status)} variant="light">
      {statusLabel(status)}
    </Badge>
  );
}

function toRemarkMap(remarks: ReviewRemark[]): Record<string, ReviewRemark> {
  return remarks.reduce<Record<string, ReviewRemark>>((acc, remark) => {
    acc[remark.blockId] = remark;
    return acc;
  }, {});
}

export function ArticleDetailsPage() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [savingRemarkBlockId, setSavingRemarkBlockId] = useState<string | null>(null);
  const [deletingRemarkBlockId, setDeletingRemarkBlockId] = useState<string | null>(null);
  const [remarksByBlock, setRemarksByBlock] = useState<Record<string, ReviewRemark>>({});
  const [remarkDrafts, setRemarkDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!articleId) return;

    setLoading(true);
    try {
      const [articleResponse, remarksResponse] = await Promise.all([
        getArticleById(articleId),
        getArticleRemarks(articleId),
      ]);
      setArticle(articleResponse.data);
      setRemarksByBlock(toRemarkMap(remarksResponse.data));
      setRemarkDrafts(
        remarksResponse.data.reduce<Record<string, string>>((acc, remark) => {
          acc[remark.blockId] = remark.text;
          return acc;
        }, {}),
      );
    } catch (error) {
      showNotification({
        color: "red",
        title: "Ошибка загрузки статьи",
        message: getErrorMessage(error, "Не удалось получить данные статьи"),
      });
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const tree = useMemo(() => parseContentTree(article?.content), [article?.content]);

  const handleModeration = useCallback(async (action: "approve" | "reject" | "archive" | "publish") => {
    if (!articleId || !article) return;

    setModerating(true);
    try {
      const response =
        action === "approve"
          ? await approveArticle(articleId)
          : action === "reject"
            ? await rejectArticle(articleId)
            : action === "archive"
              ? await archiveArticle(articleId)
              : await publishArchivedArticle(articleId);
      setArticle({
        ...article,
        status: response.data.status,
        publishedAt: response.data.publishedAt,
        updatedAt: response.data.updatedAt,
      });

      showNotification({
        color: "teal",
        title: "Статус обновлен",
        message:
          action === "approve"
            ? "Статья опубликована"
            : action === "reject"
              ? "Статья возвращена в draft"
              : action === "archive"
                ? "Статья отправлена в архив"
                : "Статья опубликована из архива",
      });
    } catch (error) {
      showNotification({
        color: "red",
        title: "Ошибка модерации",
        message: getErrorMessage(error, "Не удалось изменить статус статьи"),
      });
    } finally {
      setModerating(false);
    }
  }, [articleId, article]);

  const handleSaveRemark = useCallback(async (blockId: string) => {
    if (!articleId) return;

    const text = (remarkDrafts[blockId] ?? "").trim();
    if (!text) {
      showNotification({
        color: "yellow",
        title: "Пустой комментарий",
        message: "Введите текст замечания перед сохранением",
      });
      return;
    }

    setSavingRemarkBlockId(blockId);
    try {
      const response = await upsertArticleRemark(articleId, blockId, text);
      setRemarksByBlock((prev) => ({ ...prev, [blockId]: response.data }));
      setRemarkDrafts((prev) => ({ ...prev, [blockId]: response.data.text }));
      showNotification({
        color: "teal",
        title: "Замечание сохранено",
        message: `Block ${blockId}`,
      });
    } catch (error) {
      showNotification({
        color: "red",
        title: "Ошибка сохранения",
        message: getErrorMessage(error, "Не удалось сохранить замечание"),
      });
    } finally {
      setSavingRemarkBlockId(null);
    }
  }, [articleId, remarkDrafts]);

  const handleDeleteRemark = useCallback(async (blockId: string) => {
    if (!articleId) return;

    setDeletingRemarkBlockId(blockId);
    try {
      await deleteArticleRemark(articleId, blockId);
      setRemarksByBlock((prev) => {
        const next = { ...prev };
        delete next[blockId];
        return next;
      });
      setRemarkDrafts((prev) => ({ ...prev, [blockId]: "" }));
      showNotification({
        color: "teal",
        title: "Замечание удалено",
        message: `Block ${blockId}`,
      });
    } catch (error) {
      showNotification({
        color: "red",
        title: "Ошибка удаления",
        message: getErrorMessage(error, "Не удалось удалить замечание"),
      });
    } finally {
      setDeletingRemarkBlockId(null);
    }
  }, [articleId]);

  if (!articleId) {
    return (
      <Card withBorder>
        <Text c="red">Не передан articleId</Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="start">
        <div>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconArrowLeft size={14} />}
            onClick={() => (article ? navigate(`/users/${article.authorId}`) : navigate("/users"))}
            mb={8}
          >
            К пользователю
          </Button>
          <Title order={2}>Статья</Title>
          <Text c="dimmed" size="sm">articleId: {articleId}</Text>
        </div>
        <Group>
          <Button variant="default" loading={loading} onClick={() => void load()}>Обновить</Button>
          {article?.status === "review" && (
            <>
              <Button
                leftSection={<IconCheck size={14} />}
                color="teal"
                loading={moderating}
                onClick={() => void handleModeration("approve")}
              >
                Approve
              </Button>
              <Button
                leftSection={<IconX size={14} />}
                color="red"
                variant="light"
                loading={moderating}
                onClick={() => void handleModeration("reject")}
              >
                Reject
              </Button>
            </>
          )}
          {article?.status !== "archived" && (
            <Button
              color="orange"
              variant="light"
              loading={moderating}
              onClick={() => void handleModeration("archive")}
            >
              Archive
            </Button>
          )}
          {article?.status === "archived" && (
            <Button
              color="teal"
              loading={moderating}
              onClick={() => void handleModeration("publish")}
            >
              Publish
            </Button>
          )}
        </Group>
      </Group>

      {article && (
        <>
          <Grid>
            <Grid.Col span={8}>
              <Paper withBorder radius="md" p="md">
                <Title order={3}>{article.title || "(без заголовка)"}</Title>
                <Text c="dimmed" mt={6}>{article.description || "Описание отсутствует"}</Text>
                <Group mt="md" gap="sm">
                  {statusBadge(article.status)}
                  <Badge variant="outline">author: {article.authorId}</Badge>
                  <Badge variant="outline">mainCategory: {article.mainCategoryId}</Badge>
                </Group>
              </Paper>
            </Grid.Col>
            <Grid.Col span={4}>
              <Paper withBorder radius="md" p="md">
                <Text size="sm">Создана: <b>{formatDateTime(article.createdAt)}</b></Text>
                <Text size="sm" mt={6}>Обновлена: <b>{formatDateTime(article.updatedAt)}</b></Text>
                <Text size="sm" mt={6}>Опубликована: <b>{formatDateTime(article.publishedAt)}</b></Text>
                <Text size="sm" mt={8}>Категории: {article.categories.length ? article.categories.join(", ") : "-"}</Text>
              </Paper>
            </Grid.Col>
          </Grid>

          <Card withBorder className="panel-card">
            <Stack gap="sm">
              <Group justify="space-between">
                <Title order={3}>Структура контента</Title>
                <Text size="sm" c="dimmed">
                  topics: {tree.topics.length} · pages: {tree.pages.length} · blocks: {tree.blocks.length}
                </Text>
              </Group>

              {tree.topics.length === 0 && (
                <Text c="dimmed">Топики/страницы/блоки отсутствуют или не распознаны.</Text>
              )}

              {tree.topics.map((topic) => {
                const topicPages = tree.pages
                  .filter((page) => page.topicId === topic.id)
                  .sort((a, b) => a.order - b.order);

                return (
                  <Box key={topic.id}>
                    <Paper withBorder p="sm" radius="md">
                      <Group justify="space-between">
                        <div>
                          <Text fw={700}>Topic #{topic.order}: {topic.title}</Text>
                          <Text size="xs" c="dimmed">{topic.id}</Text>
                        </div>
                        <Badge variant="light">pages: {topicPages.length}</Badge>
                      </Group>
                    </Paper>

                    {topicPages.map((page) => {
                      const pageBlocks = tree.blocks
                        .filter((block) => block.pageId === page.id)
                        .sort((a, b) => a.order - b.order);

                      return (
                        <Paper key={page.id} withBorder p="sm" radius="md" mt="sm" ml="md">
                          <Group justify="space-between">
                            <div>
                              <Text fw={600}>Page #{page.order}</Text>
                              <Text size="xs" c="dimmed">{page.id}</Text>
                            </div>
                            <Badge variant="outline">blocks: {pageBlocks.length}</Badge>
                          </Group>

                          <ScrollArea mt="sm">
                            <Table miw={1220} verticalSpacing="xs">
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th style={{ width: 90 }}>Order</Table.Th>
                                  <Table.Th style={{ width: 100 }}>Type</Table.Th>
                                  <Table.Th style={{ width: 180 }}>Block ID</Table.Th>
                                  <Table.Th style={{ width: 240 }}>Layout</Table.Th>
                                  <Table.Th style={{ width: 240 }}>Payload</Table.Th>
                                  <Table.Th style={{ width: 350 }}>Замечание</Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {pageBlocks.map((block) => {
                                  const remark = remarksByBlock[block.id] ?? null;
                                  const draftText = remarkDrafts[block.id] ?? remark?.text ?? "";
                                  const saving = savingRemarkBlockId === block.id;
                                  const deleting = deletingRemarkBlockId === block.id;

                                  return (
                                    <Table.Tr key={block.id}>
                                      <Table.Td>{block.order}</Table.Td>
                                      <Table.Td><Badge variant="light">{block.type}</Badge></Table.Td>
                                      <Table.Td><Code>{block.id}</Code></Table.Td>
                                      <Table.Td>
                                        <Code block>{prettyJson(block.layout)}</Code>
                                      </Table.Td>
                                      <Table.Td>
                                        <Code block>{prettyJson(block.payload)}</Code>
                                      </Table.Td>
                                      <Table.Td>
                                        <Stack gap={6}>
                                          <Textarea
                                            autosize
                                            minRows={2}
                                            value={draftText}
                                            placeholder="Комментарий для автора по этому блоку"
                                            onChange={(event) => {
                                              const text = event.currentTarget.value;
                                              setRemarkDrafts((prev) => ({ ...prev, [block.id]: text }));
                                            }}
                                          />
                                          <Group gap="xs">
                                            <Button
                                              size="xs"
                                              loading={saving}
                                              onClick={() => void handleSaveRemark(block.id)}
                                            >
                                              Сохранить
                                            </Button>
                                            <Button
                                              size="xs"
                                              color="red"
                                              variant="light"
                                              leftSection={<IconTrash size={12} />}
                                              disabled={!remark}
                                              loading={deleting}
                                              onClick={() => void handleDeleteRemark(block.id)}
                                            >
                                              Удалить
                                            </Button>
                                          </Group>
                                          {remark && (
                                            <Text size="xs" c="dimmed">
                                              Обновлено: {formatDateTime(remark.updatedAt)} · {remark.author.username}
                                            </Text>
                                          )}
                                        </Stack>
                                      </Table.Td>
                                    </Table.Tr>
                                  );
                                })}
                                {pageBlocks.length === 0 && (
                                  <Table.Tr>
                                    <Table.Td colSpan={6}>
                                      <Text size="sm" c="dimmed">В этой странице нет блоков.</Text>
                                    </Table.Td>
                                  </Table.Tr>
                                )}
                              </Table.Tbody>
                            </Table>
                          </ScrollArea>
                        </Paper>
                      );
                    })}

                    <Divider my="sm" />
                  </Box>
                );
              })}
            </Stack>
          </Card>
        </>
      )}
    </Stack>
  );
}
