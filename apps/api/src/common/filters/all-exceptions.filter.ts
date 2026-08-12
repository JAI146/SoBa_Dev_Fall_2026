import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import {
  ApiErrorCode,
  type ApiErrorCodeValue,
  type ApiErrorResponse,
} from '@purposemint/contracts';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ZodValidationException } from '../pipes/zod-validation.pipe';

const CODE_BY_STATUS: Record<number, ApiErrorCodeValue> = {
  [HttpStatus.BAD_REQUEST]: ApiErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ApiErrorCode.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: ApiErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ApiErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ApiErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ApiErrorCode.RATE_LIMITED,
  [HttpStatus.SERVICE_UNAVAILABLE]: ApiErrorCode.SERVICE_UNAVAILABLE,
};

const DEFAULT_MESSAGE: Record<ApiErrorCodeValue, string> = {
  [ApiErrorCode.VALIDATION_FAILED]:
    "Something in that request didn't look quite right — have another go.",
  [ApiErrorCode.UNAUTHENTICATED]:
    'You need to be signed in to do that. Signing in again should sort it.',
  [ApiErrorCode.FORBIDDEN]: "This one isn't available on your account.",
  [ApiErrorCode.NOT_FOUND]: "We couldn't find what you were looking for.",
  [ApiErrorCode.CONFLICT]: "That doesn't fit with what we already have on file.",
  [ApiErrorCode.RATE_LIMITED]:
    "That's a few tries in a short window. Take a minute and try again.",
  [ApiErrorCode.SERVICE_UNAVAILABLE]:
    "We're having a moment. Give it a few seconds and try again.",
  [ApiErrorCode.INTERNAL_ERROR]:
    'Something went wrong on our end — nothing you did. Please try again in a moment.',
};

/** Nest's own 404 for an unmatched route. Not something to show a person. */
const ROUTER_NOT_FOUND = /^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/;

/**
 * The only place an error becomes a response body. Driver errors, constraint
 * names and stack traces stay on the server; the client gets the normalized
 * contract from `@purposemint/contracts` and nothing more.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const status = this.resolveStatus(exception);
    const code =
      CODE_BY_STATUS[status] ??
      (status >= 500
        ? ApiErrorCode.INTERNAL_ERROR
        : ApiErrorCode.VALIDATION_FAILED);

    const body: ApiErrorResponse = {
      error: {
        code,
        message: this.resolveMessage(exception, code),
        ...(exception instanceof ZodValidationException
          ? { fields: exception.fields }
          : {}),
      },
      statusCode: status,
      path: request.originalUrl ?? request.url,
      timestamp: new Date().toISOString(),
    };

    this.log(exception, status, request);
    response.status(status).json(body);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) return exception.getStatus();
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private resolveMessage(
    exception: unknown,
    code: ApiErrorCodeValue,
  ): string {
    // A driver error can carry table and constraint names. Never surface it.
    if (exception instanceof QueryFailedError) {
      return DEFAULT_MESSAGE[ApiErrorCode.INTERNAL_ERROR];
    }
    if (exception instanceof ZodValidationException) {
      return DEFAULT_MESSAGE[ApiErrorCode.VALIDATION_FAILED];
    }
    if (exception instanceof ThrottlerException) {
      return DEFAULT_MESSAGE[ApiErrorCode.RATE_LIMITED];
    }
    if (exception instanceof HttpException) {
      const custom = this.extractHttpMessage(exception);
      if (custom && !ROUTER_NOT_FOUND.test(custom)) return custom;
    }
    return DEFAULT_MESSAGE[code];
  }

  private extractHttpMessage(exception: HttpException): string | null {
    const payload = exception.getResponse();
    if (typeof payload === 'string') return payload;
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const { message } = payload as { message: unknown };
      if (typeof message === 'string') return message;
      if (Array.isArray(message) && typeof message[0] === 'string') {
        return message[0];
      }
    }
    return null;
  }

  private log(exception: unknown, status: number, request: Request): void {
    // Never log the request body — it carries passwords, OTPs and tokens.
    const where = `${request.method} ${request.originalUrl ?? request.url}`;
    if (status >= 500) {
      const error = exception instanceof Error ? exception : undefined;
      this.logger.error(
        `${where} failed with ${status}: ${error?.message ?? 'unknown error'}`,
        error?.stack,
      );
      return;
    }
    this.logger.debug(`${where} rejected with ${status}`);
  }
}
