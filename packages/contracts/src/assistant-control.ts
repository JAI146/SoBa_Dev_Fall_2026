import { z } from "zod";
import { assistantChartSchema } from "./assistant-chat";

export const assistantControlPath = "/admin/assistant-control";
export const assistantControlChanged = "purposemint-assistant-control-changed";
export const assistantBudgetModes = ["flexible", "balanced"] as const;
export const assistantBudgetSchema = z
  .object({
    limitCents: z.number().int().min(0).max(10_000_000),
    mode: z.enum(assistantBudgetModes),
    revision: z.number().int().nonnegative(),
    shares: z.record(z.string().uuid(), z.number().int().min(0).max(10_000)),
  })
  .strict();
export type AssistantBudget = z.infer<typeof assistantBudgetSchema>;

const staff = z.object({
  id: z.string().uuid(),
  name: z.string(),
  role: z.string(),
});
export const assistantControlSchema = z.object({
  budget: assistantBudgetSchema,
  model: z.string(),
  month: z.string(),
  daily: z.array(z.object({ day: z.string(), dollars: z.number() })),
  spend: z.array(
    z.object({ id: z.string(), name: z.string(), dollars: z.number() }),
  ),
  admins: z.array(
    staff.extend({ lastActivity: z.string().nullable(), builtIn: z.boolean() }),
  ),
  requests: z.array(
    staff.extend({ note: z.string(), requestedAt: z.string() }),
  ),
});
export const assistantStatusSchema = z.object({
  access: z.enum([
    "available",
    "none",
    "pending",
    "denied",
    "revoked",
    "paused",
  ]),
  usedDollars: z.number(),
  limitDollars: z.number(),
  month: z.string(),
});
export const assistantTranscriptSchema = z.object({
  turns: z.array(
    z.object({
      id: z.string().uuid(),
      conversationId: z.string().uuid(),
      at: z.string(),
      prompt: z.string().nullable(),
      answer: z.string().nullable(),
      charts: z.array(assistantChartSchema).nullable(),
    }),
  ),
  next: z.string().nullable(),
});
export type AssistantControl = z.infer<typeof assistantControlSchema>;
export type AssistantStatus = z.infer<typeof assistantStatusSchema>;
export type AssistantTranscript = z.infer<typeof assistantTranscriptSchema>;
export const assistantRequestSchema = z
  .object({ note: z.string().trim().min(1).max(1000) })
  .strict();
export const assistantDecisionSchema = z
  .object({ decision: z.enum(["approve", "deny", "revoke"]) })
  .strict();
export const assistantTranscriptFiltersSchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    search: z.string().trim().max(200).optional(),
    prompts: z.enum(["true", "false"]).default("true"),
    answers: z.enum(["true", "false"]).default("true"),
    searchPrompts: z.enum(["true", "false"]).optional(),
    searchAnswers: z.enum(["true", "false"]).optional(),
    cursor: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    ({ prompts, answers, from, to }) =>
      (prompts === "true" || answers === "true") &&
      (!from || !to || from <= to),
  );
