/**
 * Browser-side client for the standalone Express API.
 *
 * The API is a separate origin, so it cannot read the embedded app's Shopify
 * session cookie. Instead every request carries a fresh App Bridge session
 * token, which the API verifies (see `server/src/authenticate.ts`).
 */

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

/** Thrown for any non-2xx API response, carrying the standard error envelope. */
export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }

  /** Field-keyed messages from a 422, for mapping onto Polaris form inputs. */
  get fieldErrors(): Record<string, string[]> | null {
    return this.code === "VALIDATION_ERROR" &&
      this.details &&
      typeof this.details === "object"
      ? (this.details as Record<string, string[]>)
      : null;
  }
}

async function getSessionToken(): Promise<string> {
  // `shopify` is the App Bridge global injected by the embedded app host.
  if (typeof shopify === "undefined" || !shopify?.idToken) {
    throw new ApiClientError(
      401,
      "NO_APP_BRIDGE",
      "This page must be opened from the Shopify admin.",
    );
  }
  return shopify.idToken();
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  { isRetry = false }: { isRetry?: boolean } = {},
): Promise<T> {
  const token = await getSessionToken();

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error: ApiErrorBody = body?.error ?? {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again.",
    };

    // Session tokens are short-lived. One transparent retry with a fresh token
    // keeps an expiry from ever reaching the merchant as an error.
    if (error.code === "SESSION_TOKEN_EXPIRED" && !isRetry) {
      return request<T>(path, init, { isRetry: true });
    }

    throw new ApiClientError(
      response.status,
      error.code,
      error.message,
      error.details,
    );
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  put: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
