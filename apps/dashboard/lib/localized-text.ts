import type { Locale } from "@muakhah/i18n";

/** Pick the text for the active locale, falling back to the other language when empty. */
export function pickLocalizedText(
  locale: Locale,
  en: string | null | undefined,
  ar: string | null | undefined,
): string | null {
  const enVal = en?.trim() ?? "";
  const arVal = ar?.trim() ?? "";
  if (locale === "ar") {
    return arVal || enVal || null;
  }
  return enVal || arVal || null;
}

export type BilingualFamilyTextFields = {
  headOfFamilyName?: string | null;
  headOfFamilyNameAr?: string | null;
  detailedAddress?: string | null;
  detailedAddressAr?: string | null;
  areaGeneral?: string | null;
  areaGeneralAr?: string | null;
  publicStory?: string | null;
  publicStoryAr?: string | null;
};

export function localizedFamilyName(
  locale: Locale,
  family: Pick<BilingualFamilyTextFields, "headOfFamilyName" | "headOfFamilyNameAr">,
): string | null {
  return pickLocalizedText(
    locale,
    family.headOfFamilyName,
    family.headOfFamilyNameAr,
  );
}

export function localizedPublicStory(
  locale: Locale,
  family: Pick<BilingualFamilyTextFields, "publicStory" | "publicStoryAr">,
): string | null {
  return pickLocalizedText(locale, family.publicStory, family.publicStoryAr);
}

export function localizedAreaGeneral(
  locale: Locale,
  family: Pick<BilingualFamilyTextFields, "areaGeneral" | "areaGeneralAr">,
): string | null {
  return pickLocalizedText(locale, family.areaGeneral, family.areaGeneralAr);
}

export function localizedDetailedAddress(
  locale: Locale,
  family: Pick<BilingualFamilyTextFields, "detailedAddress" | "detailedAddressAr">,
): string | null {
  return pickLocalizedText(
    locale,
    family.detailedAddress,
    family.detailedAddressAr,
  );
}
