"use client";

import { ar, en, translate, translateEnum, useI18n } from "@muakhah/i18n";
import type { Locale } from "@muakhah/i18n";

const DATA_SOURCES = [
  "",
  "field_visit",
  "partner_ngo",
  "phone_intake",
  "community_referral",
  "self_registration",
  "imported_batch",
  "other",
] as const;

const GOVERNORATES = [
  "",
  "north_gaza",
  "gaza",
  "middle_area",
  "khan_younis",
  "rafah",
  "unknown",
] as const;

const CASE_CATEGORIES = [
  "",
  "martyr_family",
  "widow",
  "orphans",
  "modest_family",
  "no_breadwinner",
  "displaced",
  "medical",
  "disability",
  "general",
] as const;

const PRIORITIES = ["", "critical", "high", "medium", "normal"] as const;

const PROFILE_STATUSES = [
  "published",
  "hidden",
  "archived",
  "suspended",
  "needs_update",
] as const;

const PROFILE_STATUSES_LEGACY = ["draft", "pending_review"] as const;

const HOUSING_STATUSES = [
  "tent",
  "shelter",
  "damaged_home",
  "hosted",
  "rented",
  "unknown",
] as const;

const INCOME_STATUSES = ["none", "limited", "unstable", "unknown"] as const;

const DISPLACEMENT_STATUSES = [
  "displaced",
  "not_displaced",
  "returned",
  "unknown",
] as const;

function EnumOptions({
  group,
  values,
  locale,
}: {
  group: string;
  values: readonly string[];
  locale?: Locale;
}) {
  const { te, t } = useI18n();
  const tree = locale ? (locale === "ar" ? ar : en) : null;
  const translateLabel = (value: string) =>
    tree
      ? value === ""
        ? translate(tree, `families.form.placeholders.select.${group}`)
        : translateEnum(tree, group, value)
      : value === ""
        ? t(`families.form.placeholders.select.${group}`)
        : te(group, value);
  return (
    <>
      {values.map((value) => (
        <option key={value || "empty"} value={value}>
          {translateLabel(value)}
        </option>
      ))}
    </>
  );
}

export function DataSourceOptions({ locale }: { locale?: Locale } = {}) {
  return <EnumOptions group="dataSource" values={DATA_SOURCES} locale={locale} />;
}

export function GovernorateOptions({ locale }: { locale?: Locale } = {}) {
  return <EnumOptions group="governorate" values={GOVERNORATES} locale={locale} />;
}

export function CaseCategoryOptions({ locale }: { locale?: Locale } = {}) {
  return <EnumOptions group="caseCategory" values={CASE_CATEGORIES} locale={locale} />;
}

export function ProfileStatusOptions({
  extended = false,
  locale,
}: {
  extended?: boolean;
  locale?: Locale;
}) {
  return (
    <EnumOptions
      group="profileStatus"
      locale={locale}
      values={
        extended
          ? [...PROFILE_STATUSES, ...PROFILE_STATUSES_LEGACY]
          : PROFILE_STATUSES
      }
    />
  );
}

export function PriorityOptions({ locale }: { locale?: Locale } = {}) {
  return <EnumOptions group="priorityLevel" values={PRIORITIES} locale={locale} />;
}

export function HousingOptions({ locale }: { locale?: Locale } = {}) {
  return <EnumOptions group="housingStatus" values={HOUSING_STATUSES} locale={locale} />;
}

export function IncomeOptions({ locale }: { locale?: Locale } = {}) {
  return <EnumOptions group="incomeStatus" values={INCOME_STATUSES} locale={locale} />;
}

export function DisplacementOptions({ locale }: { locale?: Locale } = {}) {
  return (
    <EnumOptions group="displacementStatus" values={DISPLACEMENT_STATUSES} locale={locale} />
  );
}
