export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiRequestOptions = {
  method?: ApiMethod;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  baseUrl?: string;
  responseType?: "json" | "text" | "blob";
  credentials?: RequestCredentials;
};

export type ApiError = Error & {
  status: number;
  data?: unknown;
};

const DEFAULT_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api";

function buildUrl(path: string, query?: ApiRequestOptions["query"], baseUrl = DEFAULT_BASE_URL): string {
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${trimmedBase}${normalizedPath}`, window.location.origin);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function isBodySerializable(body: unknown): body is Record<string, unknown> {
  return !!body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams);
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    query,
    body,
    headers = {},
    signal,
    baseUrl,
    responseType = "json",
    credentials,
  } = options;

  const url = buildUrl(path, query, baseUrl);
  const requestHeaders: Record<string, string> = { ...headers };
  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
    signal,
    credentials,
  };

  if (body !== undefined) {
    if (isBodySerializable(body)) {
      requestInit.body = JSON.stringify(body);
      if (!requestHeaders["Content-Type"]) {
        requestHeaders["Content-Type"] = "application/json";
      }
    } else {
      requestInit.body = body as BodyInit;
    }
  }

  const response = await fetch(url, requestInit);

  if (!response.ok) {
    let errorData: unknown;
    try {
      errorData = await response.clone().json();
    } catch {
      try {
        errorData = await response.clone().text();
      } catch {
        errorData = undefined;
      }
    }

    const error = new Error(`Request failed with status ${response.status}`) as ApiError;
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  if (responseType === "blob") return (await response.blob()) as T;
  if (responseType === "text") return (await response.text()) as T;
  return (await response.json()) as T;
}

