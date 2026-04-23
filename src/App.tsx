import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Center, Paper, Stack, Text, Title } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { IconAlertTriangle, IconLogin2 } from "@tabler/icons-react";
import type { User } from "@smth/shared";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "./components/AdminShell";
import { ArticleDetailsPage } from "./pages/ArticleDetailsPage";
import { ReviewQueuePage } from "./pages/ReviewQueuePage";
import { UserDetailsPage } from "./pages/UserDetailsPage";
import { UsersPage } from "./pages/UsersPage";
import { fetchMe, getGoogleLoginUrl, logout } from "./shared/api";
import { getErrorMessage } from "./shared/lib/getErrorMessage";

type SessionState = "loading" | "authorized" | "unauthorized" | "forbidden";

function isAllowedRole(role: User["role"]): boolean {
  return role === "admin" || role === "moderator";
}

function FullscreenMessage(props: {
  title: string;
  description: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
}) {
  const { title, description, buttonLabel, onButtonClick } = props;

  return (
    <Center mih="100vh">
      <Paper shadow="sm" radius="lg" p="xl" w={560} withBorder>
        <Stack>
          <Title order={2}>{title}</Title>
          <Text c="dimmed">{description}</Text>
          {buttonLabel && onButtonClick && (
            <Button leftSection={<IconLogin2 size={16} />} onClick={onButtonClick} w="fit-content">
              {buttonLabel}
            </Button>
          )}
        </Stack>
      </Paper>
    </Center>
  );
}

function App() {
  const [sessionState, setSessionState] = useState<SessionState>("loading");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const bootstrap = useCallback(async () => {
    setSessionState("loading");

    try {
      const me = await fetchMe();
      const user = me.data;
      setCurrentUser(user);

      if (!isAllowedRole(user.role)) {
        setSessionState("forbidden");
        return;
      }

      setSessionState("authorized");
    } catch {
      setCurrentUser(null);
      setSessionState("unauthorized");
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const googleLoginUrl = useMemo(() => getGoogleLoginUrl(), []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      showNotification({
        color: "red",
        title: "Ошибка выхода",
        message: getErrorMessage(error, "Не удалось завершить сессию"),
      });
    } finally {
      setCurrentUser(null);
      setSessionState("unauthorized");
    }
  }, []);

  if (sessionState === "loading") {
    return (
      <Center mih="100vh">
        <Paper shadow="xs" p="lg" radius="md" withBorder>
          <Text>Проверяем сессию...</Text>
        </Paper>
      </Center>
    );
  }

  if (sessionState === "unauthorized") {
    return (
      <FullscreenMessage
        title="Нужна авторизация"
        description="Войдите в систему, чтобы открыть админ-панель модерации."
        buttonLabel="Войти через Google"
        onButtonClick={() => window.location.assign(googleLoginUrl)}
      />
    );
  }

  if (sessionState === "forbidden") {
    return (
      <Center mih="100vh">
        <Paper shadow="sm" radius="lg" p="xl" w={560} withBorder>
          <Stack>
            <Alert icon={<IconAlertTriangle size={16} />} color="red" title="Недостаточно прав">
              Для входа нужен роль <b>admin</b> или <b>moderator</b>.
            </Alert>
            <Button variant="default" onClick={handleLogout} w="fit-content">
              Выйти
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <Routes>
      <Route element={<AdminShell user={currentUser} onLogout={() => void handleLogout()} />}>
        <Route path="/" element={<Navigate to="/review" replace />} />
        <Route path="/review" element={<ReviewQueuePage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/users/:userId" element={<UserDetailsPage />} />
        <Route path="/users/:userId/articles" element={<Navigate to="../" relative="path" replace />} />
        <Route path="/articles/:articleId" element={<ArticleDetailsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/review" replace />} />
    </Routes>
  );
}

export default App;
