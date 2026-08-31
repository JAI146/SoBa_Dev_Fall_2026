import type { ApiErrorResponse } from "@purposemint/contracts";

const API_BASE = "/api/backend/api";

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

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

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
