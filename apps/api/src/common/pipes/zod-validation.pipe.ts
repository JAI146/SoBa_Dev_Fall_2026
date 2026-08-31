import {
  BadRequestException,
  Injectable,
  type ArgumentMetadata,
  type PipeTransform,
} from '@nestjs/common';
import type { ApiFieldError } from '@purposemint/contracts';
import { ZodError, type ZodTypeAny, type infer as ZodInfer } from 'zod';

/** Thrown by the pipe and rendered by `AllExceptionsFilter` into the error contract. */
export class ZodValidationException extends BadRequestException {
  constructor(readonly fields: ApiFieldError[]) {
    super('Validation failed');
  }
}

interface ZodSchemaCarrier {
  zodSchema: ZodTypeAny;
}

function hasZodSchema(value: unknown): value is ZodSchemaCarrier {
  return typeof value === 'function' && 'zodSchema' in value;
}

/**
 * Turns a contracts schema into a class usable as a `@Body()` / `@Query()`
 * metatype. The class is never instantiated — it only carries the schema so the
 * global pipe can find it, while giving the handler the inferred type.
 *
 *   class LoginDto extends zodDto(loginSchema) {}
 *   login(@Body() body: LoginDto) { ... }  // body is LoginInput
 */
export function zodDto<T extends ZodTypeAny>(schema: T) {
  class ZodDto {
    static readonly zodSchema: ZodTypeAny = schema;
  }
  return ZodDto as unknown as {
    new (): ZodInfer<T>;
    readonly zodSchema: T;
  };
}

function toFieldErrors(error: ZodError): ApiFieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '_',
    message: issue.message,
  }));
}

/**
 * Registered globally. Parameters whose metatype carries a Zod schema are
 * validated and replaced with the parsed value; everything else passes through
 * untouched, so route params and primitives are unaffected.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodTypeAny) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const schema = this.schema ??
      (hasZodSchema(metadata.metatype) ? metadata.metatype.zodSchema : null);
    if (!schema) return value;

    const result = schema.safeParse(value);
    if (result.success) return result.data;
    throw new ZodValidationException(toFieldErrors(result.error));
  }
}
