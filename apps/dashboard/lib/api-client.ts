import {
  userPublicSchema,
  type AuthResponse,
  type ApiErrorResponse,
} from "@purposemint/contracts";
import { clearAuth, getStoredUser, getToken, updateAuth } from "./auth";

const API_ORIGIN = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/+$/, "");
const API_BASE = `${API_ORIGIN}/api`;

export type ResponseSchema<T> = {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshing: Promise<string> | null = null;

async function renewSession(previousToken: string): Promise<string> {
  if (refreshing) return refreshing;
  const renew = async () => {
    const currentToken = getToken();
    if (!currentToken) throw new ApiError("Please sign in again.", 401);
    if (currentToken !== previousToken) return currentToken;
    const userId = getStoredUser()?.id;
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientType: "dashboard" }),
    });
    if (res.status === 401) {
      if (getToken() === currentToken) clearAuth();
      throw new ApiError("Your session ended. Please sign in again.", 401);
    }
    const data = await parseResponse<AuthResponse>(res);
    if (
      !data ||
      typeof data.accessToken !== "string" ||
      !userPublicSchema.safeParse(data.user).success ||
      data.user.id !== userId
    ) {
      throw new ApiError(
        "Unable to renew this session. Please sign in again.",
        401,
      );
    }
    if (!updateAuth(data, currentToken)) {
      throw new ApiError(
        "The signed-in session changed. Please try again.",
        401,
      );
    }
    return data.accessToken;
  };
  // Serialise rotating-cookie refreshes across dashboard tabs as well as requests.
  const coordinatedRenew = async (): Promise<string> => {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return await navigator.locks.request(
        "purposemint-session-refresh",
        renew,
      );
    }
    return await renew();
  };
  refreshing = coordinatedRenew().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function parseResponse<T>(
  res: Response,
  schema?: ResponseSchema<T>,
): Promise<T> {
  const data: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    const message = isApiErrorResponse(data)
      ? data.error.message
      : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  if (schema) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError("The API returned an unexpected response.", 502);
    }
    return parsed.data;
  }
  return data as T;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
  schema?: ResponseSchema<T>,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (
    res.status === 401 &&
    token &&
    getToken() &&
    (!path.startsWith("/auth/") || path === "/auth/logout")
  ) {
    const renewed = await renewSession(token);
    headers.set("Authorization", `Bearer ${renewed}`);
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });
    if (res.status === 401 && getToken() === renewed) clearAuth();
  }

  return parseResponse<T>(res, schema);
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = value.error;
  return Boolean(
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string",
  );
}

export { API_BASE };
