import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform(
    (value) =>
      value === true || value === 'true' || value === 'on' || value === '1',
  );

/**
 * The single source of truth for configuration. `main.ts` runs this before the
 * Nest application is created, so a missing secret is a startup failure rather
 * than a 500 at 3am.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required — the API cannot start without it.'),
  DATABASE_SSL: booleanish.default(false),

  JWT_ACCESS_SECRET: z
    .string()
    .min(
      32,
      'JWT_ACCESS_SECRET must be at least 32 characters. Generate one with `openssl rand -base64 48`.',
    ),
  JWT_ACCESS_TTL: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_ACCESS_TTL looks like `15m`, `1h` or `900s`.')
    .default('15m'),

  REFRESH_TTL_DAYS_MOBILE: z.coerce.number().int().min(1).max(365).default(30),
  REFRESH_TTL_DAYS_DASHBOARD: z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .default(7),

  OTP_TTL_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce
    .number()
    .int()
    .min(0)
    .max(3600)
    .default(60),

  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().min(1).default(60),
  THROTTLE_LIMIT: z.coerce.number().int().min(1).default(120),

  DASHBOARD_URL: z.string().url().default('http://localhost:3001'),
  /** Comma-separated. Merged with DASHBOARD_URL to form the CORS allowlist. */
  CORS_ORIGINS: z.string().default(''),

  INITIAL_ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),
  INITIAL_ADMIN_PASSWORD: z.string().optional(),

  INITIAL_AWS_ACCESS_KEY_ID: z.string().optional(),
  INITIAL_AWS_SECRET_ACCESS_KEY: z.string().optional(),
  INITIAL_AWS_REGION: z.string().optional(),
  INITIAL_AWS_S3_BUCKET: z.string().optional(),

  INITIAL_SMTP_SERVER: z.string().optional(),
  INITIAL_SMTP_PORT: z.string().optional(),
  INITIAL_SMTP_EMAIL_USER: z.string().optional(),
  INITIAL_SMTP_EMAIL_PASSWORD: z.string().optional(),
  INITIAL_SMTP_FROM_EMAIL: z.string().optional(),
  INITIAL_SMTP_BCC: z.string().optional(),
  INITIAL_SMTP_ENABLED: booleanish.default(false),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Used both as the `ConfigModule.validate` hook and directly from `main.ts`.
 * Throws with every problem listed at once rather than one per restart.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (result.success) return result.data;

  const problems = result.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(`Environment configuration is not valid:\n${problems}`);
}

/** Origins allowed to call the API with credentials. */
export function corsOrigins(env: Env): string[] {
  const configured = env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return Array.from(new Set([env.DASHBOARD_URL, ...configured]));
}
