import type { AuthLogoutResponse, AuthMeResponse, AuthRefreshResponse } from "@smth/shared";
import type { ApiError, ApiRequestOptions } from "./apiClient";
import { apiRequest } from "./apiClient";

const AUTH_ME_PATH = "/auth/me";
const AUTH_REFRESH_PATH = "/auth/refresh";
const AUTH_LOGOUT_PATH = "/auth/logout";

let refreshRequest: Promise<void> | null = null;

export async function requestWithAutoRefresh<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...options, credentials: "include" });
  } catch (error) {
    const apiError = error as ApiError;
    if (apiError.status !== 401) {
      throw error;
    }

    await refreshAuth();
    return await apiRequest<T>(path, { ...options, credentials: "include" });
  }
}

export async function fetchMe(): Promise<AuthMeResponse> {
  return requestWithAutoRefresh<AuthMeResponse>(AUTH_ME_PATH, { method: "GET" });
}

export async function refreshAuth(): Promise<void> {
  if (refreshRequest) {
    return refreshRequest;
  }

  refreshRequest = (async () => {
    await apiRequest<AuthRefreshResponse>(AUTH_REFRESH_PATH, {
      method: "POST",
      credentials: "include",
    });
  })();

  try {
    await refreshRequest;
  } finally {
    refreshRequest = null;
  }
}

export async function logout(): Promise<AuthLogoutResponse> {
  return apiRequest<AuthLogoutResponse>(AUTH_LOGOUT_PATH, {
    method: "POST",
    credentials: "include",
  });
}

export function getGoogleLoginUrl(): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";
  const trimmedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const url = new URL(`${trimmedBase}/auth/google`, window.location.origin);
  return url.toString();
}

