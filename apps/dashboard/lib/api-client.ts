const API_BASE = "/api/backend/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    const raw = data as { message?: string | string[] };
    let message = `Request failed (${res.status})`;
    if (raw.message) {
      message = Array.isArray(raw.message)
        ? raw.message.join(", ")
        : String(raw.message);
    }
    throw new ApiError(message, res.status);
  }
  return data;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
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

  return parseResponse<T>(res);
}

export { API_BASE };
