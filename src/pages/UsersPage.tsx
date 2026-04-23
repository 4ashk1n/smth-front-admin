import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionIcon, Badge, Card, Group, Pagination, ScrollArea, Stack, Table, Text, TextInput, Title, Tooltip } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { IconRefresh, IconSearch } from "@tabler/icons-react";
import type { AdminUserListItem } from "@smth/shared";
import { useNavigate } from "react-router-dom";
import { getUsers } from "../shared/api";
import { formatDateTime } from "../shared/lib/formatDateTime";
import { getErrorMessage } from "../shared/lib/getErrorMessage";

const PAGE_SIZE = 20;

export function UsersPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 350);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getUsers({
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
        message: getErrorMessage(error, "Не удалось получить список пользователей"),
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

  return (
    <Stack gap="md">
      <Group justify="space-between" align="end">
        <div>
          <Title order={2}>Пользователи</Title>
          <Text c="dimmed" size="sm">Нажмите на строку пользователя для перехода к его карточке</Text>
        </div>
        <Group>
          <TextInput
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            placeholder="Поиск username/email"
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
          <Table verticalSpacing="sm" horizontalSpacing="md" miw={1180}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Пользователь</Table.Th>
                <Table.Th>Роль</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>Провайдер</Table.Th>
                <Table.Th>Создан</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((user) => (
                <Table.Tr
                  key={user.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/users/${user.id}`, { state: { user } })}
                >
                  <Table.Td>
                    <Text fw={600}>{user.username}</Text>
                    <Text size="xs" c="dimmed">{user.firstname} {user.lastname}</Text>
                    <Text ff="monospace" size="xs" c="dimmed">{user.id}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={user.role === "admin" ? "teal" : user.role === "moderator" ? "cyan" : "gray"} variant="light">
                      {user.role}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{user.email ?? "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{user.provider ?? "-"}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{formatDateTime(user.createdAt)}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
              {!loading && items.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center" py="lg">Пользователи не найдены</Text>
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
