import { AppShell, Badge, Box, Button, Group, NavLink, Text, Title } from "@mantine/core";
import { IconChecklist, IconUsers } from "@tabler/icons-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import type { User } from "@smth/shared";

type AdminShellProps = {
  user: User;
  onLogout: () => void;
};

const NAV_ITEMS = [
  { label: "На ревью", to: "/review", icon: IconChecklist },
  { label: "Пользователи", to: "/users", icon: IconUsers },
];

export function AdminShell({ user, onLogout }: AdminShellProps) {
  const location = useLocation();

  return (
    <AppShell
      header={{ height: 72 }}
      navbar={{ width: 290, breakpoint: 0 }}
      padding="md"
    >
      <AppShell.Header px="lg">
        <Group h="100%" justify="space-between">
          <Group gap="md">
            <Box className="brand-mark" />
            <div>
              <Title order={3} size="h4">SMTH Admin</Title>
              <Text size="xs" c="dimmed">Moderation console</Text>
            </div>
          </Group>
          <Group gap="sm">
            <Badge variant="light" color={user.role === "admin" ? "teal" : "cyan"}>
              {user.role}
            </Badge>
            <Text size="sm" fw={600}>{user.username}</Text>
            <Button variant="default" size="xs" onClick={onLogout}>Выйти</Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md" className="admin-navbar">
        <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb="sm">Навигация</Text>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            leftSection={<item.icon size={16} stroke={1.8} />}
            label={item.label}
            active={location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)}
            variant="filled"
            mb={4}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
