import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Pagination,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { IconArrowLeft, IconRefresh, IconSearch } from "@tabler/icons-react";
import type { AdminUserListItem, ArticleMeta, ArticleStatus, UserMeta, UserMetrics } from "@smth/shared";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getUserArticles, getUserById, getUserMetrics, getUsers } from "../shared/api";
import { formatDateTime } from "../shared/lib/formatDateTime";
import { getErrorMessage } from "../shared/lib/getErrorMessage";
import { statusColor, statusLabel } from "../shared/lib/status";

const PAGE_SIZE = 20;
const STATUS_FILTER_VALUES: Array<ArticleStatus> = ["published", "review", "draft", "archived"];

type LocationState = {
  user?: AdminUserListItem;
};

export function UserDetailsPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const stateUser = (location.state as LocationState | null)?.user ?? null;

  const [userMeta, setUserMeta] = useState<UserMeta | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUserListItem | null>(stateUser);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);

  const [articles, setArticles] = useState<ArticleMeta[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [debouncedSearch] = useDebouncedValue(search, 350);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const loadUserInfo = useCallback(async () => {
    if (!userId) return;

    try {
      const [userResp, metricsResp] = await Promise.all([getUserById(userId), getUserMetrics(userId)]);
      setUserMeta(userResp.data);
      setMetrics(metricsResp.data);

      if (!stateUser) {
        const userListResp = await getUsers({ page: 1, limit: 50, search: userResp.data.username });
        const found = userListResp.data.items.find((item) => item.id === userId) ?? null;
        setAdminUser(found);
      }
    } catch (error) {
      showNotification({
        color: "red",
        title: "Ошибка загрузки профиля",
        message: getErrorMessage(error, "Не удалось получить данные пользователя"),
      });
    }
  }, [userId, stateUser]);

  const loadArticles = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await getUserArticles(userId, {
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        status: (status as ArticleStatus | null) ?? undefined,
      });
      setArticles(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      showNotification({
        color: "red",
        title: "Ошибка загрузки статей",
        message: getErrorMessage(error, "Не удалось получить статьи пользователя"),
      });
    } finally {
      setLoading(false);
    }
  }, [userId, page, debouncedSearch, status]);

  useEffect(() => {
    void loadUserInfo();
  }, [loadUserInfo]);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

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
      <Group justify="space-between" align="start">
        <div>
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconArrowLeft size={14} />}
            onClick={() => navigate("/users")}
            mb={8}
          >
            К пользователям
          </Button>
          <Title order={2}>Пользователь</Title>
          <Text c="dimmed" size="sm">userId: {userId}</Text>
        </div>
      </Group>

      <SimpleGrid cols={3} spacing="md">
        <Paper withBorder p="md" radius="md">
          <Text size="xs" c="dimmed" tt="uppercase">Профиль</Text>
          <Text fw={700} mt={6}>{userMeta?.username ?? "-"}</Text>
          <Text size="sm">{userMeta ? `${userMeta.firstname} ${userMeta.lastname}` : "-"}</Text>
          <Text size="xs" c="dimmed" mt={8}>{userMeta?.id ?? "-"}</Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="xs" c="dimmed" tt="uppercase">Аккаунт</Text>
          <Group mt={6} gap="xs">
            <Badge color={adminUser?.role === "admin" ? "teal" : adminUser?.role === "moderator" ? "cyan" : "gray"} variant="light">
              {adminUser?.role ?? "unknown"}
            </Badge>
            <Text size="sm">{adminUser?.provider ?? "-"}</Text>
          </Group>
          <Text size="sm" mt={8}>{adminUser?.email ?? "Email недоступен"}</Text>
          <Text size="xs" c="dimmed" mt={8}>Создан: {formatDateTime(adminUser?.createdAt)}</Text>
        </Paper>
        <Paper withBorder p="md" radius="md">
          <Text size="xs" c="dimmed" tt="uppercase">Метрики</Text>
          <Text mt={6}>Статей: <b>{metrics?.articles ?? 0}</b></Text>
          <Text size="sm">Подписчиков: <b>{metrics?.followers ?? 0}</b></Text>
          <Text size="sm">Подписок: <b>{metrics?.following ?? 0}</b></Text>
        </Paper>
      </SimpleGrid>

      <Group justify="space-between" align="end">
        <div>
          <Title order={3}>Статьи пользователя</Title>
          <Text c="dimmed" size="sm">Нажмите на статью для перехода к полной карточке</Text>
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
            <ActionIcon variant="default" size="lg" onClick={() => void loadArticles()} loading={loading}>
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
              {articles.map((article) => (
                <Table.Tr
                  key={article.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/articles/${article.id}`)}
                >
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
              {!loading && articles.length === 0 && (
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
