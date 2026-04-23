import type { ApiError } from "../api/apiClient";

export function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;

  const apiError = error as ApiError;
  if (typeof apiError.data === "string") return apiError.data;
  if (apiError.data && typeof apiError.data === "object") {
    const maybeMessage = (apiError.data as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }

  return fallback;
}

