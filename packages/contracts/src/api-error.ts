import { z } from "zod";

/**
 * Every non-2xx response from the API has this shape. The global exception
 * filter is the only thing allowed to build it, so clients can rely on it.
 */
export const ApiErrorCode = {
  VALIDATION_FAILED: "validation_failed",
  UNAUTHENTICATED: "unauthenticated",
  FORBIDDEN: "forbidden",
  NOT_FOUND: "not_found",
  CONFLICT: "conflict",
  RATE_LIMITED: "rate_limited",
  SERVICE_UNAVAILABLE: "service_unavailable",
  INTERNAL_ERROR: "internal_error",
} as const;

export type ApiErrorCodeValue = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export interface ApiFieldError {
  /** Dot path into the request body, e.g. `newPassword`. */
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCodeValue;
    /** Already written in product voice — safe to show to a person as-is. */
    message: string;
    fields?: ApiFieldError[];
  };
  statusCode: number;
  path: string;
  timestamp: string;
}

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
