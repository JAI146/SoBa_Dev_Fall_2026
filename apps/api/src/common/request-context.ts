import type { Request } from 'express';

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

/** Trusts `X-Forwarded-For` only when `trust proxy` is enabled on the app. */
export function requestContext(request: Request): RequestContext {
  return {
    ipAddress: request.ip ?? request.socket.remoteAddress ?? null,
    userAgent: truncate(request.headers['user-agent'], 512),
  };
}

function truncate(value: unknown, max: number): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  return value.length > max ? value.slice(0, max) : value;
}
