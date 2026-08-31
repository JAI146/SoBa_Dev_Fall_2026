import { z } from "zod";
import { reflectionKindValues } from "./enums";

export const moodScoreSchema = z
  .number()
  .int()
  .min(1, "Choose a mood from 1 to 5.")
  .max(5, "Choose a mood from 1 to 5.");
export const reflectionThemePublicSchema = z.object({
  key: z.string(),
  label: z.string(),
  colorToken: z.string(),
});
export const reflectionPublicSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(reflectionKindValues),
  body: z.string().max(1000).nullable(),
  moodScore: moodScoreSchema.nullable(),
  durationSeconds: z.number().int().min(0).nullable(),
  reflectedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  themes: z.array(reflectionThemePublicSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ReflectionPublic = z.infer<typeof reflectionPublicSchema>;

export const createReflectionSchema = z.object({
  kind: z.literal("text"),
  body: z
    .string()
    .trim()
    .min(1, "Write a few words before saving.")
    .max(1000, "Keep your reflection to 1,000 characters or fewer."),
  moodScore: moodScoreSchema.optional(),
});
export const updateReflectionSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, "A written reflection cannot be empty.")
      .max(1000, "Keep your reflection to 1,000 characters or fewer.")
      .optional(),
    moodScore: moodScoreSchema.nullable().optional(),
  })
  .refine(
    (input) => input.body !== undefined || input.moodScore !== undefined,
    { message: "Change the reflection or its mood before saving." },
  );
export const createMoodEntrySchema = z.object({ moodScore: moodScoreSchema });
export const reflectionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const reflectionsListResponseSchema = z.object({
  items: z.array(reflectionPublicSchema),
  page: z.number().int(),
  hasMore: z.boolean(),
});
export const deleteReflectionResponseSchema = z.object({ message: z.string() });

export type CreateReflectionInput = z.infer<typeof createReflectionSchema>;
export type UpdateReflectionInput = z.infer<typeof updateReflectionSchema>;
export type CreateMoodEntryInput = z.infer<typeof createMoodEntrySchema>;
export type ReflectionListQuery = z.infer<typeof reflectionListQuerySchema>;
export type ReflectionsListResponse = z.infer<
  typeof reflectionsListResponseSchema
>;
export type DeleteReflectionResponse = z.infer<
  typeof deleteReflectionResponseSchema
>;
