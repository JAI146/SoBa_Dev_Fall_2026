import { ApiClientError } from '@/lib/api/client';

type ZodIssueLike = {
  message: string;
  path: PropertyKey[];
};

export function getZodFieldErrors<TField extends string>(
  issues: ZodIssueLike[],
  fieldAliases: Partial<Record<string, TField>> = {},
) {
  const errors: Partial<Record<TField, string>> = {};

  for (const issue of issues) {
    const sourceField = String(issue.path[0] ?? '');
    const field = fieldAliases[sourceField] ?? (sourceField as TField);
    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

export function getApiFormErrors<TField extends string>(
  error: unknown,
  supportedFields: readonly TField[],
  fieldAliases: Partial<Record<string, TField>> = {},
) {
  if (!(error instanceof ApiClientError)) {
    return {
      fieldErrors: {} as Partial<Record<TField, string>>,
      formError: error instanceof Error ? error.message : undefined,
    };
  }

  const supported = new Set<string>(supportedFields);
  const fieldErrors: Partial<Record<TField, string>> = {};
  let hasUnhandledField = false;

  for (const fieldError of error.fieldErrors) {
    const field = fieldAliases[fieldError.field] ?? (fieldError.field as TField);
    if (supported.has(field)) {
      fieldErrors[field] = fieldError.message;
    } else {
      hasUnhandledField = true;
    }
  }

  return {
    fieldErrors,
    formError: error.fieldErrors.length === 0 || hasUnhandledField ? error.message : undefined,
  };
}
