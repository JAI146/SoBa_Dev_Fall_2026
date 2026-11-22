import { z } from "zod";

export const assistantChatInputSchema = z
  .object({
    continuationId: z.string().uuid().optional(),
    continuationTask: z.string().trim().min(1).max(4000).optional(),
    conversationId: z.string().uuid().optional(),
    messages: z
      .array(
        z
          .object({
            role: z.enum(["user", "assistant"]),
            content: z.string().trim().min(1).max(4000),
          })
          .strict(),
      )
      .min(1)
      .max(12),
  })
  .strict()
  .refine(
    (value) => !value.continuationId || !!value.conversationId,
    "A continuation needs its conversation.",
  )
  .refine(
    (value) => value.messages.at(-1)?.role === "user",
    "End with a user message.",
  );

export const assistantChartSchema = z
  .object({
    type: z.enum(["bar", "line", "area", "pie"]),
    title: z.string().min(1).max(160),
    valueLabel: z.string().min(1).max(80),
    scope: z.string().min(1).max(500),
    data: z
      .array(
        z
          .object({
            name: z.string().max(160),
            value: z.number().finite().nullable(),
            sampleSize: z.number().int().nonnegative().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict();
export type AssistantChart = z.infer<typeof assistantChartSchema>;

export const assistantChatResponseSchema = z.object({
  continuationId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  continuationRequired: z.boolean().optional(),
  text: z.string().min(1),
  charts: z.array(assistantChartSchema).max(3),
  model: z.string(),
  usage: z.object({ inputTokens: z.number(), outputTokens: z.number() }),
});
export type AssistantChatResponse = z.infer<typeof assistantChatResponseSchema>;
