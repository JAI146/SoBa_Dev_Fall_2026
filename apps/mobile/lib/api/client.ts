import {
  ApiErrorCode,
  ClientType,
  type ApiErrorCodeValue,
  type ApiErrorResponse,
  type ApiFieldError,
  type AuthResponse,
} from '@purposemint/contracts';

type AuthBridge = {
  applySession: (session: AuthResponse) => Promise<void>;
  clearSession: () => Promise<void>;
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
};

type ApiRequestOptions<TBody> = Omit<RequestInit, 'body' | 'headers'> & {
  authenticated?: boolean;
  body?: TBody;
  headers?: Record<string, string>;
};

const API_PATH_PREFIX = '/api';

let authBridge: AuthBridge | null = null;
let refreshPromise: Promise<AuthResponse | null> | null = null;

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: ApiErrorCodeValue,
    readonly fieldErrors: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export function configureAuthBridge(bridge: AuthBridge | null) {
  authBridge = bridge;
}

export async function apiRequest<TResponse, TBody = never>(
  path: string,
  options: ApiRequestOptions<TBody> = {},
): Promise<TResponse> {
  return executeRequest<TResponse, TBody>(path, options, false);
}

export function refreshAuthSession() {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function executeRequest<TResponse, TBody>(
  path: string,
  options: ApiRequestOptions<TBody>,
  hasRetried: boolean,
): Promise<TResponse> {
  const { authenticated = false, body, headers, ...requestInit } = options;
  const requestHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const accessToken = authenticated ? authBridge?.getAccessToken() : null;
  if (accessToken) {
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path), {
      ...requestInit,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: requestHeaders,
    });
  } catch {
    throw new ApiClientError(
      'We could not reach PurposeMint. Check your connection and try again.',
      0,
      ApiErrorCode.SERVICE_UNAVAILABLE,
    );
  }

  if (response.status === 401 && authenticated && !hasRetried) {
    const refreshedSession = await refreshAuthSession();

    if (refreshedSession) {
      return executeRequest<TResponse, TBody>(path, options, true);
    }
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

async function performRefresh(): Promise<AuthResponse | null> {
  const bridge = authBridge;
  const refreshToken = bridge?.getRefreshToken();

  if (!bridge || !refreshToken) {
    if (bridge) {
      await bridge.clearSession();
    }
    return null;
  }

  try {
    const session = await executeRequest<
      AuthResponse,
      { refreshToken: string; clientType: typeof ClientType.MOBILE }
    >(
      '/auth/refresh',
      {
        body: { refreshToken, clientType: ClientType.MOBILE },
        method: 'POST',
      },
      true,
    );

    await bridge.applySession(session);
    return session;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      await bridge.clearSession();
      return null;
    }

    throw error;
  }
}

async function parseApiError(response: Response) {
  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (isApiErrorResponse(payload)) {
    return new ApiClientError(
      payload.error.message,
      response.status,
      payload.error.code,
      payload.error.fields ?? [],
    );
  }

  return new ApiClientError(
    'Something went wrong while talking to PurposeMint. Please try again.',
    response.status,
    response.status === 429 ? ApiErrorCode.RATE_LIMITED : ApiErrorCode.INTERNAL_ERROR,
  );
}

function isApiErrorResponse(payload: unknown): payload is ApiErrorResponse {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) {
    return false;
  }

  const error = payload.error;
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      typeof error.code === 'string' &&
      'message' in error &&
      typeof error.message === 'string',
  );
}

function buildUrl(path: string) {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

  if (!baseUrl) {
    throw new ApiClientError(
      'PurposeMint is missing its API URL. Add EXPO_PUBLIC_API_URL and restart the app.',
      0,
      ApiErrorCode.SERVICE_UNAVAILABLE,
    );
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${API_PATH_PREFIX}${normalizedPath}`;
}
