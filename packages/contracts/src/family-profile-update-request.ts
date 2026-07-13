import { z } from "zod";
import type { FamilyMediaItem, FamilyReceivingMethod } from "./family";

export const ProfileUpdateRequestStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type ProfileUpdateRequestStatusValue =
  (typeof ProfileUpdateRequestStatus)[keyof typeof ProfileUpdateRequestStatus];

export const familySelfUpdatableFields = [
  "headOfFamilyName",
  "internalPhone",
  "detailedAddress",
  "areaGeneral",
  "publicStory",
  "externalLinks",
  "familySize",
  "childrenCount",
  "infantCount",
  "womenCount",
  "elderlyCount",
  "governorate",
  "caseCategory",
  "housingStatus",
  "incomeStatus",
  "displacementStatus",
  "hasWidow",
  "hasOrphans",
  "hasDisabledMember",
  "hasChronicPatient",
] as const;

export type FamilySelfUpdatableFieldKey =
  (typeof familySelfUpdatableFields)[number];

export const createProfileUpdateRequestSchema = z.object({
  fieldKey: z.enum(familySelfUpdatableFields),
  requestedValue: z.union([
    z.string(),
    z.number(),
    z.boolean(),
  ]),
});

export type CreateProfileUpdateRequestInput = z.infer<
  typeof createProfileUpdateRequestSchema
>;

export const reviewProfileUpdateRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  adminNotes: z.string().max(2000).optional().nullable(),
});

export type ReviewProfileUpdateRequestInput = z.infer<
  typeof reviewProfileUpdateRequestSchema
>;

export interface FamilySelfProfile {
  publicCode: string;
  headOfFamilyName: string;
  headOfFamilyNameAr: string | null;
  internalPhone: string | null;
  detailedAddress: string | null;
  detailedAddressAr: string | null;
  areaGeneral: string | null;
  areaGeneralAr: string | null;
  publicStory: string | null;
  publicStoryAr: string | null;
  externalLinks: string | null;
  familySize: number;
  childrenCount: number;
  infantCount: number;
  womenCount: number;
  elderlyCount: number;
  governorate: string;
  caseCategory: string;
  housingStatus: string;
  incomeStatus: string;
  displacementStatus: string;
  hasWidow: boolean;
  hasOrphans: boolean;
  hasDisabledMember: boolean;
  hasChronicPatient: boolean;
  receivingMethods: FamilyReceivingMethod[];
  mediaItems: FamilyMediaItem[];
  updatedAt: string;
}

export interface ProfileUpdateRequestListItem {
  id: string;
  familyId: string;
  familyPublicCode: string;
  fieldKey: FamilySelfUpdatableFieldKey;
  currentValue: string;
  requestedValue: string;
  status: ProfileUpdateRequestStatusValue;
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
