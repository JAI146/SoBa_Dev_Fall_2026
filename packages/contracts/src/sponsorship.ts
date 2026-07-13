import { z } from "zod";
import type { FamilyReceivingMethod } from "./family";

export const SponsorshipType = {
  FULL: "full",
  PARTIAL: "partial",
} as const;

export type SponsorshipTypeValue =
  (typeof SponsorshipType)[keyof typeof SponsorshipType];

export const SponsorshipDurationPreset = {
  ONE_MONTH: "1_month",
  THREE_MONTHS: "3_months",
  SIX_MONTHS: "6_months",
  ONGOING: "ongoing",
} as const;

export type SponsorshipDurationPresetValue =
  (typeof SponsorshipDurationPreset)[keyof typeof SponsorshipDurationPreset];

export function durationPresetToFields(preset: SponsorshipDurationPresetValue): {
  durationMonths: number | null;
  isOngoing: boolean;
} {
  switch (preset) {
    case SponsorshipDurationPreset.ONE_MONTH:
      return { durationMonths: 1, isOngoing: false };
    case SponsorshipDurationPreset.THREE_MONTHS:
      return { durationMonths: 3, isOngoing: false };
    case SponsorshipDurationPreset.SIX_MONTHS:
      return { durationMonths: 6, isOngoing: false };
    case SponsorshipDurationPreset.ONGOING:
      return { durationMonths: null, isOngoing: true };
  }
}

export function fieldsToDurationPreset(
  durationMonths: number | null,
  isOngoing: boolean,
): SponsorshipDurationPresetValue {
  if (isOngoing) return SponsorshipDurationPreset.ONGOING;
  if (durationMonths === 1) return SponsorshipDurationPreset.ONE_MONTH;
  if (durationMonths === 3) return SponsorshipDurationPreset.THREE_MONTHS;
  if (durationMonths === 6) return SponsorshipDurationPreset.SIX_MONTHS;
  return SponsorshipDurationPreset.ONE_MONTH;
}

export const SponsorshipStatus = {
  REQUESTED: "requested",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  STOPPED: "stopped",
  DISPUTED: "disputed",
} as const;

export type SponsorshipStatusValue =
  (typeof SponsorshipStatus)[keyof typeof SponsorshipStatus];

export const createSponsorshipSchema = z
  .object({
    familyPublicCode: z.string().trim().min(1, "Family code is required"),
    type: z.enum(["full", "partial"]),
    amount: z.coerce.number().positive().optional(),
    durationPreset: z.enum(["1_month", "3_months", "6_months", "ongoing"]),
    notes: z.string().max(2000).optional().nullable(),
    selectedReceivingMethodIndex: z.coerce
      .number()
      .int()
      .min(0, "Select a receiving method"),
    initialMessage: z.string().max(2000).optional().nullable(),
    pledgeAccepted: z.preprocess(
      (val) => val === true || val === "true",
      z.literal(true, {
        errorMap: () => ({
          message: "You must accept the sponsor pledge",
        }),
      }),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.type === "partial" && (data.amount === undefined || data.amount <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount is required for partial sponsorship",
        path: ["amount"],
      });
    }
  });

export type CreateSponsorshipInput = z.infer<typeof createSponsorshipSchema>;

export const updateSponsorshipSchema = z
  .object({
    type: z.enum(["full", "partial"]),
    amount: z.coerce.number().positive().optional(),
    durationPreset: z.enum(["1_month", "3_months", "6_months", "ongoing"]),
    notes: z.string().max(2000).optional().nullable(),
    selectedReceivingMethodIndex: z.coerce.number().int().min(0).optional(),
    initialMessage: z.string().max(2000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "partial" && (data.amount === undefined || data.amount <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount is required for partial sponsorship",
        path: ["amount"],
      });
    }
  });

export type UpdateSponsorshipInput = z.infer<typeof updateSponsorshipSchema>;

export const reviewSponsorshipSchema = z
  .object({
    status: z.enum(["active", "cancelled", "clarification"]),
    adminNotes: z.string().max(2000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "clarification" && !data.adminNotes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admin notes are required when requesting clarification",
        path: ["adminNotes"],
      });
    }
  });

export type ReviewSponsorshipInput = z.infer<typeof reviewSponsorshipSchema>;

export const sponsorshipActionNotesSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
});

export type SponsorshipActionNotesInput = z.infer<
  typeof sponsorshipActionNotesSchema
>;

export const completeSponsorshipSchema = sponsorshipActionNotesSchema;
export type CompleteSponsorshipInput = SponsorshipActionNotesInput;

export const stopSponsorshipSchema = sponsorshipActionNotesSchema;
export type StopSponsorshipInput = SponsorshipActionNotesInput;

export const pauseSponsorshipSchema = sponsorshipActionNotesSchema;
export type PauseSponsorshipInput = SponsorshipActionNotesInput;

export const cancelSponsorshipSchema = sponsorshipActionNotesSchema;
export type CancelSponsorshipInput = SponsorshipActionNotesInput;

export const disputeSponsorshipSchema = sponsorshipActionNotesSchema;
export type DisputeSponsorshipInput = SponsorshipActionNotesInput;

export const setSponsorshipStatusSchema = z.object({
  status: z.enum([
    "requested",
    "active",
    "paused",
    "completed",
    "cancelled",
    "disputed",
  ]),
  notes: z.string().max(2000).optional().nullable(),
});

export type SetSponsorshipStatusInput = z.infer<typeof setSponsorshipStatusSchema>;

export interface SponsorshipListItem {
  id: string;
  familyId: string;
  familyPublicCode: string;
  donorUserId: string;
  donorName: string;
  donorEmail: string;
  type: SponsorshipTypeValue;
  monthlyAmount: number;
  durationPreset: SponsorshipDurationPresetValue;
  durationMonths: number | null;
  isOngoing: boolean;
  notes: string | null;
  selectedReceivingMethodIndex: number;
  selectedReceivingMethods: FamilyReceivingMethod[];
  canViewReceivingDetails: boolean;
  initialMessage: string | null;
  receiptUrl: string | null;
  status: SponsorshipStatusValue;
  needsClarification: boolean;
  adminNotes: string | null;
  reviewedAt: string | null;
  activatedAt: string | null;
  completedAt: string | null;
  stoppedAt: string | null;
  stopNotes: string | null;
  approvedTransferCount?: number;
  createdAt: string;
  updatedAt: string;
}
