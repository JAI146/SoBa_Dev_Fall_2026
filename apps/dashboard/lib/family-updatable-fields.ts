import type { FamilySelfUpdatableFieldKey } from "@muakhah/contracts";
import type { FormIconName } from "@/components/forms/form-icons";

export type FamilyUpdatableFieldMeta = {
  key: FamilySelfUpdatableFieldKey;
  labelKey: string;
  icon: FormIconName;
  type: "text" | "textarea" | "number" | "boolean" | "enum";
  enumGroup?: string;
};

export const FAMILY_UPDATABLE_FIELDS: FamilyUpdatableFieldMeta[] = [
  { key: "headOfFamilyName", labelKey: "families.form.fullFamilyName", icon: "users", type: "text" },
  { key: "internalPhone", labelKey: "families.form.internalPhone", icon: "phone", type: "text" },
  { key: "detailedAddress", labelKey: "families.form.detailedAddress", icon: "map", type: "textarea" },
  { key: "areaGeneral", labelKey: "families.form.area", icon: "pin", type: "text" },
  { key: "publicStory", labelKey: "families.form.publicStory", icon: "text", type: "textarea" },
  { key: "externalLinks", labelKey: "families.form.externalLinks", icon: "link", type: "textarea" },
  { key: "familySize", labelKey: "families.form.familySize", icon: "users", type: "number" },
  { key: "childrenCount", labelKey: "families.form.childrenCount", icon: "hash", type: "number" },
  { key: "infantCount", labelKey: "families.form.infantCount", icon: "hash", type: "number" },
  { key: "womenCount", labelKey: "families.form.womenCount", icon: "hash", type: "number" },
  { key: "elderlyCount", labelKey: "families.form.elderlyCount", icon: "hash", type: "number" },
  { key: "governorate", labelKey: "families.form.region", icon: "globe", type: "enum", enumGroup: "governorate" },
  { key: "caseCategory", labelKey: "families.form.caseCategory", icon: "list", type: "enum", enumGroup: "caseCategory" },
  { key: "housingStatus", labelKey: "families.form.housingStatus", icon: "home", type: "enum", enumGroup: "housingStatus" },
  { key: "incomeStatus", labelKey: "families.form.incomeStatus", icon: "money", type: "enum", enumGroup: "incomeStatus" },
  { key: "displacementStatus", labelKey: "families.form.displacementStatus", icon: "map", type: "enum", enumGroup: "displacementStatus" },
  { key: "hasWidow", labelKey: "families.form.hasWidow", icon: "user", type: "boolean" },
  { key: "hasOrphans", labelKey: "families.form.hasOrphans", icon: "users", type: "boolean" },
  { key: "hasDisabledMember", labelKey: "families.form.hasDisabled", icon: "user", type: "boolean" },
  { key: "hasChronicPatient", labelKey: "families.form.hasChronic", icon: "user", type: "boolean" },
];

export function getUpdatableFieldMeta(key: FamilySelfUpdatableFieldKey) {
  return FAMILY_UPDATABLE_FIELDS.find((field) => field.key === key);
}

export function formatProfileFieldValue(
  value: unknown,
  te: (group: string, value: string) => string,
): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

export function parseStoredProfileValue(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}
