import { z } from "zod";

export const badgeVariables = [
  { value: "savings_progress", label: "Savings progress", unit: "%" },
  { value: "saved_amount", label: "Total savings", unit: "USD" },
  { value: "completed_goals", label: "Completed savings goals", unit: "count" },
  { value: "habit_completions", label: "Habit completions", unit: "count" },
  { value: "reflections", label: "Reflections", unit: "count" },
  { value: "current_level", label: "Current level", unit: "level" },
] as const;

export const badgeVariableSchema = z.enum([
  "savings_progress",
  "saved_amount",
  "completed_goals",
  "habit_completions",
  "reflections",
  "current_level",
]);
export const badgeOperatorSchema = z.enum(["=", "<", "<=", ">", ">="]);
export const badgeRuleSchema = z
  .object({
    variable: badgeVariableSchema,
    operator: badgeOperatorSchema,
    not: z.boolean().default(false),
    value: z.number().finite().nonnegative(),
  })
  .strict()
  .superRefine((rule, ctx) => {
    if (rule.variable === "savings_progress" && rule.value > 100)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Progress must be between 0 and 100%.",
      });
    if (
      !["savings_progress", "saved_amount"].includes(rule.variable) &&
      !Number.isSafeInteger(rule.value)
    )
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Use a whole number.",
      });
    if (rule.variable === "current_level" && (rule.value < 1 || rule.value > 5))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Level must be between 1 and 5.",
      });
  });

export function isSingleBadgeEmoji(value: string): boolean {
  const segments = Array.from(
    new Intl.Segmenter("en", { granularity: "grapheme" }).segment(value),
  );
  return (
    segments.length === 1 &&
    /^(?:\p{Regional_Indicator}{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?)*(?:[\u{E0020}-\u{E007E}]+\u{E007F})?)$/u.test(
      value,
    )
  );
}

export const badgeInputSchema = z
  .object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().min(1).max(2000),
    category: z.string().trim().min(1).max(100),
    iconEmoji: z
      .string()
      .trim()
      .max(64)
      .refine(isSingleBadgeEmoji, "Enter exactly one emoji."),
    criteria: z.array(badgeRuleSchema).min(1).max(20),
    active: z.boolean().default(false),
    reward: z.string().trim().min(1).max(500).nullable().default(null),
  })
  .strict();
export const badgeUpdateSchema = badgeInputSchema.extend({
  version: z.number().int().positive(),
});
export const badgeSchema = badgeInputSchema.extend({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  awardCount: z.number().int().nonnegative(),
});
export const badgesResponseSchema = z.object({
  items: z.array(badgeSchema),
  canManage: z.boolean(),
});
export const badgeAwardSchema = z.object({
  id: z.string().uuid(),
  badgeId: z.string().uuid(),
  badgeName: z.string(),
  iconEmoji: z.string(),
  userId: z.string().uuid(),
  userName: z.string(),
  userEmail: z.string(),
  unlockedAt: z.string().datetime(),
});
export const badgeAwardsResponseSchema = z.object({
  items: z.array(badgeAwardSchema),
});
export const earnedBadgesResponseSchema = z.object({
  items: z.array(
    badgeInputSchema.extend({
      id: z.string().uuid(),
      unlockedAt: z.string().datetime(),
    }).strip(),
  ),
});
export type BadgeRule = z.infer<typeof badgeRuleSchema>;
export type BadgeInput = z.infer<typeof badgeInputSchema>;
export type BadgeUpdate = z.infer<typeof badgeUpdateSchema>;
export type BadgeDefinition = z.infer<typeof badgeSchema>;
export type BadgeAwardRecord = z.infer<typeof badgeAwardSchema>;
