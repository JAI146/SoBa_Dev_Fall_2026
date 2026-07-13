import { z } from "zod";
import type { SponsorshipStatusValue, SponsorshipTypeValue } from "./sponsorship";

export const TransferProofStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  CLARIFICATION: "clarification",
  DISPUTED: "disputed",
} as const;

export type TransferProofStatusValue =
  (typeof TransferProofStatus)[keyof typeof TransferProofStatus];

export interface TransferProofListItem {
  id: string;
  sponsorshipId: string;
  familyId: string;
  familyPublicCode: string;
  donorUserId: string;
  donorName: string;
  donorEmail: string;
  fileUrl: string;
  notes: string | null;
  status: TransferProofStatusValue;
  receivingMethodIndex: number;
  receivingMethodType: string | null;
  adminNotes: string | null;
  reviewedAt: string | null;
  amount: number | null;
  transferDate: string | null;
  createdAt: string;
}

export interface TransferProofDetail extends TransferProofListItem {
  monthlyAmount: number;
  sponsorshipStatus: SponsorshipStatusValue;
  sponsorshipType: SponsorshipTypeValue;
  approvedTransferCount: number;
}

export const createTransferProofSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
  receivingMethodIndex: z.coerce.number().int().min(0),
  amount: z.coerce.number().positive("Transfer amount must be greater than zero"),
  transferDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Transfer date must be YYYY-MM-DD"),
});

export type CreateTransferProofInput = z.infer<typeof createTransferProofSchema>;

export const reviewTransferProofSchema = z.object({
  status: z.enum([
    "pending",
    "accepted",
    "rejected",
    "clarification",
    "disputed",
  ]),
  adminNotes: z.string().max(2000).optional().nullable(),
});

export type ReviewTransferProofInput = z.infer<typeof reviewTransferProofSchema>;

export const transferProofQuerySchema = z.object({
  status: z
    .enum(["pending", "accepted", "rejected", "clarification", "disputed", ""])
    .optional(),
  search: z.string().optional(),
});

export type TransferProofQueryInput = z.infer<typeof transferProofQuerySchema>;
