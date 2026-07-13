import type {
  FamilyDetail,
  FamilyReceivingMethod,
} from "@muakhah/contracts";
import { createFamilySchema, updateFamilySchema } from "@muakhah/contracts";

export interface FamilyFormValues {
  accountEmail: string;
  headOfFamilyName: string;
  headOfFamilyNameAr: string;
  nationalId: string;
  internalPhone: string;
  detailedAddress: string;
  detailedAddressAr: string;
  externalLinks: string;
  dataSource: string;
  internalNotes: string;
  verificationNotes: string;
  assignedCaseOfficer: string;
  governorate: string;
  areaGeneral: string;
  areaGeneralAr: string;
  publicStory: string;
  publicStoryAr: string;
  familySize: string;
  childrenCount: string;
  infantCount: string;
  womenCount: string;
  elderlyCount: string;
  hasWidow: boolean;
  hasOrphans: boolean;
  hasDisabledMember: boolean;
  hasChronicPatient: boolean;
  housingStatus: string;
  incomeStatus: string;
  displacementStatus: string;
  caseCategory: string;
  priorityLevel: string;
  monthlyRequiredAmount: string;
  profileStatus: string;
  isPilotFamily: boolean;
  pilotBatchNumber: string;
  pilotNotes: string;
  receivingMethods: FamilyReceivingMethod[];
}

export const defaultFamilyFormValues: FamilyFormValues = {
  accountEmail: "",
  headOfFamilyName: "",
  headOfFamilyNameAr: "",
  nationalId: "",
  internalPhone: "",
  detailedAddress: "",
  detailedAddressAr: "",
  externalLinks: "",
  dataSource: "",
  internalNotes: "",
  verificationNotes: "",
  assignedCaseOfficer: "",
  governorate: "unknown",
  areaGeneral: "",
  areaGeneralAr: "",
  publicStory: "",
  publicStoryAr: "",
  familySize: "1",
  childrenCount: "0",
  infantCount: "0",
  womenCount: "0",
  elderlyCount: "0",
  hasWidow: false,
  hasOrphans: false,
  hasDisabledMember: false,
  hasChronicPatient: false,
  housingStatus: "unknown",
  incomeStatus: "unknown",
  displacementStatus: "unknown",
  caseCategory: "general",
  priorityLevel: "medium",
  monthlyRequiredAmount: "0",
  profileStatus: "published",
  isPilotFamily: true,
  pilotBatchNumber: "1",
  pilotNotes: "",
  receivingMethods: [],
};

export function familyDetailToFormValues(family: FamilyDetail): FamilyFormValues {
  return {
    accountEmail: family.accountEmail ?? "",
    headOfFamilyName: family.headOfFamilyName ?? "",
    headOfFamilyNameAr: family.headOfFamilyNameAr ?? "",
    nationalId: family.nationalId ?? "",
    internalPhone: family.internalPhone ?? "",
    detailedAddress: family.detailedAddress ?? "",
    detailedAddressAr: family.detailedAddressAr ?? "",
    externalLinks: family.externalLinks ?? "",
    dataSource: family.dataSource ?? "",
    internalNotes: family.internalNotes ?? "",
    verificationNotes: family.verificationNotes ?? "",
    assignedCaseOfficer: family.assignedCaseOfficer ?? "",
    governorate: family.governorate,
    areaGeneral: family.areaGeneral ?? "",
    areaGeneralAr: family.areaGeneralAr ?? "",
    publicStory: family.publicStory ?? "",
    publicStoryAr: family.publicStoryAr ?? "",
    familySize: String(family.familySize),
    childrenCount: String(family.childrenCount),
    infantCount: String(family.infantCount ?? 0),
    womenCount: String(family.womenCount),
    elderlyCount: String(family.elderlyCount),
    hasWidow: family.hasWidow,
    hasOrphans: family.hasOrphans,
    hasDisabledMember: family.hasDisabledMember,
    hasChronicPatient: family.hasChronicPatient,
    housingStatus: family.housingStatus,
    incomeStatus: family.incomeStatus,
    displacementStatus: family.displacementStatus,
    caseCategory: family.caseCategory,
    priorityLevel: family.priorityLevel,
    monthlyRequiredAmount: String(family.monthlyRequiredAmount),
    profileStatus: family.profileStatus,
    isPilotFamily: family.isPilotFamily,
    pilotBatchNumber: String(family.pilotBatchNumber),
    pilotNotes: family.pilotNotes ?? "",
    receivingMethods: family.receivingMethods ?? [],
  };
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function buildFamilyPayloadFromValues(
  values: FamilyFormValues,
  passwords: { accountPassword: string; confirmAccountPassword: string },
  options?: { includePasswords?: boolean },
) {
  const includePasswords = options?.includePasswords ?? true;
  const payload: Record<string, unknown> = {
    accountEmail: values.accountEmail.trim(),
    headOfFamilyName: values.headOfFamilyName.trim(),
    headOfFamilyNameAr: optionalText(values.headOfFamilyNameAr),
    nationalId: optionalText(values.nationalId),
    internalPhone: optionalText(values.internalPhone),
    detailedAddress: optionalText(values.detailedAddress),
    detailedAddressAr: optionalText(values.detailedAddressAr),
    externalLinks: optionalText(values.externalLinks),
    dataSource: optionalText(values.dataSource),
    internalNotes: optionalText(values.internalNotes),
    verificationNotes: optionalText(values.verificationNotes),
    assignedCaseOfficer: optionalText(values.assignedCaseOfficer),
    governorate: values.governorate,
    areaGeneral: optionalText(values.areaGeneral),
    areaGeneralAr: optionalText(values.areaGeneralAr),
    publicStory: optionalText(values.publicStory),
    publicStoryAr: optionalText(values.publicStoryAr),
    familySize: Number(values.familySize),
    childrenCount: Number(values.childrenCount || 0),
    infantCount: Number(values.infantCount || 0),
    womenCount: Number(values.womenCount || 0),
    elderlyCount: Number(values.elderlyCount || 0),
    hasWidow: values.hasWidow,
    hasOrphans: values.hasOrphans,
    hasDisabledMember: values.hasDisabledMember,
    hasChronicPatient: values.hasChronicPatient,
    housingStatus: values.housingStatus,
    incomeStatus: values.incomeStatus,
    displacementStatus: values.displacementStatus,
    caseCategory: values.caseCategory,
    priorityLevel: values.priorityLevel,
    monthlyRequiredAmount: Number(values.monthlyRequiredAmount),
    profileStatus: values.profileStatus,
    isPilotFamily: values.isPilotFamily,
    pilotBatchNumber: Number(values.pilotBatchNumber || 1),
    pilotNotes: optionalText(values.pilotNotes),
    receivingMethods: values.receivingMethods,
  };

  if (includePasswords) {
    payload.accountPassword = passwords.accountPassword;
    payload.confirmAccountPassword = passwords.confirmAccountPassword;
  } else if (passwords.accountPassword) {
    payload.accountPassword = passwords.accountPassword;
    payload.confirmAccountPassword = passwords.confirmAccountPassword;
  }

  return payload;
}

export function buildFamilyPayload(
  fd: FormData,
  passwords: { accountPassword: string; confirmAccountPassword: string },
  options?: { includePasswords?: boolean },
) {
  const values: FamilyFormValues = {
    ...defaultFamilyFormValues,
    accountEmail: String(fd.get("accountEmail") ?? ""),
    headOfFamilyName: String(fd.get("headOfFamilyName") ?? ""),
    headOfFamilyNameAr: String(fd.get("headOfFamilyNameAr") ?? ""),
    nationalId: String(fd.get("nationalId") ?? ""),
    internalPhone: String(fd.get("internalPhone") ?? ""),
    detailedAddress: String(fd.get("detailedAddress") ?? ""),
    detailedAddressAr: String(fd.get("detailedAddressAr") ?? ""),
    externalLinks: String(fd.get("externalLinks") ?? ""),
    dataSource: String(fd.get("dataSource") ?? ""),
    internalNotes: String(fd.get("internalNotes") ?? ""),
    verificationNotes: String(fd.get("verificationNotes") ?? ""),
    assignedCaseOfficer: String(fd.get("assignedCaseOfficer") ?? ""),
    governorate: String(fd.get("governorate") ?? "unknown"),
    areaGeneral: String(fd.get("areaGeneral") ?? ""),
    areaGeneralAr: String(fd.get("areaGeneralAr") ?? ""),
    publicStory: String(fd.get("publicStory") ?? ""),
    publicStoryAr: String(fd.get("publicStoryAr") ?? ""),
    familySize: String(fd.get("familySize") ?? "1"),
    childrenCount: String(fd.get("childrenCount") ?? "0"),
    infantCount: String(fd.get("infantCount") ?? "0"),
    womenCount: String(fd.get("womenCount") ?? "0"),
    elderlyCount: String(fd.get("elderlyCount") ?? "0"),
    hasWidow: fd.get("hasWidow") === "on",
    hasOrphans: fd.get("hasOrphans") === "on",
    hasDisabledMember: fd.get("hasDisabledMember") === "on",
    hasChronicPatient: fd.get("hasChronicPatient") === "on",
    housingStatus: String(fd.get("housingStatus") ?? "unknown"),
    incomeStatus: String(fd.get("incomeStatus") ?? "unknown"),
    displacementStatus: String(fd.get("displacementStatus") ?? "unknown"),
    caseCategory: String(fd.get("caseCategory") ?? "general"),
    priorityLevel: String(fd.get("priorityLevel") ?? "medium"),
    monthlyRequiredAmount: String(fd.get("monthlyRequiredAmount") ?? "0"),
    profileStatus: String(fd.get("profileStatus") ?? "published"),
    isPilotFamily: fd.get("isPilotFamily") === "on",
    pilotBatchNumber: String(fd.get("pilotBatchNumber") ?? "1"),
    pilotNotes: String(fd.get("pilotNotes") ?? ""),
    receivingMethods: [],
  };

  return buildFamilyPayloadFromValues(values, passwords, options);
}

export function validateFamilyCounts(values: FamilyFormValues): string | null {
  const familySize = Number(values.familySize);
  const childrenCount = Number(values.childrenCount || 0);
  const infantCount = Number(values.infantCount || 0);
  const womenCount = Number(values.womenCount || 0);
  const elderlyCount = Number(values.elderlyCount || 0);

  if (familySize < childrenCount + infantCount) {
    return "familySizeMinChildrenInfants";
  }
  if (childrenCount + infantCount + womenCount + elderlyCount > familySize) {
    return "familySizeDemographics";
  }
  return null;
}

export function validateFamilyPayload(
  payload: Record<string, unknown>,
  options?: { forUpdate?: boolean },
): string | null {
  const schema = options?.forUpdate ? updateFamilySchema : createFamilySchema;
  const parsed = schema.safeParse(payload);
  if (parsed.success) return null;

  const receivingIssue = parsed.error.errors.find((issue) =>
    issue.path[0] === "receivingMethods",
  );
  if (receivingIssue) {
    return receivingIssue.message;
  }

  return parsed.error.errors[0]?.message ?? "Validation failed";
}
