import type {
  FamilyMediaItemView,
  FamilyPublicProfile,
  FamilyReceivingMethod,
} from "@muakhah/contracts";
import type { Locale } from "@muakhah/i18n";
import {
  localizedAreaGeneral,
  localizedPublicStory,
} from "@/lib/localized-text";

export type PublicProfileTextField = {
  type: "text";
  id: string;
  labelKey: string;
  value: string;
  multiline?: boolean;
};

export type PublicProfileMediaField = {
  type: "media";
  id: "media";
  labelKey: "families.form.media";
  items: FamilyMediaItemView[];
};

export type PublicProfileReceivingMethodsField = {
  type: "receivingMethods";
  id: "receivingMethods";
  labelKey: "families.form.receivingMethods";
  methods: FamilyReceivingMethod[];
};

export type PublicProfileField =
  | PublicProfileTextField
  | PublicProfileMediaField
  | PublicProfileReceivingMethodsField;

function formatMoney(amount: number) {
  return `$${amount.toFixed(0)}`;
}

/** Mirrors add-family → Public Profile Data field order; skips empty values. */
export function buildAddFormPublicProfileFields(
  family: FamilyPublicProfile,
  te: (category: string, value: string) => string,
  t: (key: string) => string,
  locale: Locale = "en",
): PublicProfileField[] {
  const fields: PublicProfileField[] = [];
  const area = localizedAreaGeneral(locale, family);
  const story = localizedPublicStory(locale, family);

  if (family.governorate) {
    fields.push({
      type: "text",
      id: "governorate",
      labelKey: "families.form.region",
      value: te("governorate", family.governorate),
    });
  }

  if (area) {
    fields.push({
      type: "text",
      id: "areaGeneral",
      labelKey: "families.form.area",
      value: area,
    });
  }

  if (family.familySize > 0) {
    fields.push({
      type: "text",
      id: "familySize",
      labelKey: "families.form.familySize",
      value: String(family.familySize),
    });
  }

  if (family.childrenCount > 0) {
    fields.push({
      type: "text",
      id: "childrenCount",
      labelKey: "families.form.childrenCount",
      value: String(family.childrenCount),
    });
  }

  if (family.infantCount > 0) {
    fields.push({
      type: "text",
      id: "infantCount",
      labelKey: "families.form.infantCount",
      value: String(family.infantCount),
    });
  }

  if (family.womenCount > 0) {
    fields.push({
      type: "text",
      id: "womenCount",
      labelKey: "families.form.womenCount",
      value: String(family.womenCount),
    });
  }

  if (family.elderlyCount > 0) {
    fields.push({
      type: "text",
      id: "elderlyCount",
      labelKey: "families.form.elderlyCount",
      value: String(family.elderlyCount),
    });
  }

  if (family.caseCategory) {
    fields.push({
      type: "text",
      id: "caseCategory",
      labelKey: "families.form.caseCategory",
      value: te("caseCategory", family.caseCategory),
    });
  }

  if (family.priorityLevel) {
    fields.push({
      type: "text",
      id: "priorityLevel",
      labelKey: "families.form.priority",
      value: te("priorityLevel", family.priorityLevel),
    });
  }

  if (family.monthlyRequiredAmount > 0) {
    fields.push({
      type: "text",
      id: "monthlyRequiredAmount",
      labelKey: "families.form.monthlyRequired",
      value: formatMoney(family.monthlyRequiredAmount),
    });
  }

  if ((family.receivingMethods ?? []).length > 0) {
    fields.push({
      type: "receivingMethods",
      id: "receivingMethods",
      labelKey: "families.form.receivingMethods",
      methods: family.receivingMethods,
    });
  }

  if (family.mediaItems.length > 0) {
    fields.push({
      type: "media",
      id: "media",
      labelKey: "families.form.media",
      items: family.mediaItems,
    });
  }

  if (story) {
    fields.push({
      type: "text",
      id: "publicStory",
      labelKey: "families.form.publicStory",
      value: story,
      multiline: true,
    });
  }

  return fields;
}
