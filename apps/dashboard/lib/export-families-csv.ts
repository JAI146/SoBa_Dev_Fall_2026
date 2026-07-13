import type { FamilyDetail } from "@muakhah/contracts";
import { downloadCsv } from "./export-csv";

type Translate = (key: string) => string;
type TranslateEnum = (group: string, value: string) => string;

function boolLabel(value: boolean, t: Translate): string {
  return value ? t("common.yes") : t("common.no");
}

export function exportFamiliesDetailCsv(
  families: FamilyDetail[],
  t: Translate,
  te: TranslateEnum,
): void {
  const headers = [
    t("families.form.publicCode"),
    t("families.form.headName"),
    t("families.form.loginEmail"),
    t("families.form.nationalId"),
    t("families.form.internalPhone"),
    t("families.form.detailedAddress"),
    t("families.form.dataSource"),
    t("families.form.internalNotes"),
    t("families.form.verificationNotes"),
    t("families.form.region"),
    t("families.form.area"),
    t("families.form.familySize"),
    t("families.form.childrenCount"),
    t("families.form.womenCount"),
    t("families.form.elderlyCount"),
    t("families.form.caseCategory"),
    t("families.form.priority"),
    t("families.form.monthlyRequired"),
    t("families.form.monthlyCovered"),
    t("families.form.monthlyRemaining"),
    t("families.form.housingStatus"),
    t("families.form.incomeStatus"),
    t("families.form.displacementStatus"),
    t("families.form.hasWidow"),
    t("families.form.hasOrphans"),
    t("families.form.hasDisabled"),
    t("families.form.hasChronic"),
    t("families.form.publicStory"),
    t("families.form.profileStatus"),
    t("families.form.coverageStatus"),
    t("families.form.pilotCheckbox"),
    t("families.form.pilotBatch"),
    t("families.form.pilotNotes"),
    t("families.form.loginEnabled"),
    t("families.form.accountStatus"),
    t("filters.account"),
    t("families.form.created"),
    t("families.form.lastUpdated"),
  ];

  const rows = families.map((family) => [
    family.publicCode,
    family.headOfFamilyName ?? "",
    family.accountEmail ?? "",
    family.nationalId ?? "",
    family.internalPhone ?? "",
    family.detailedAddress ?? "",
    family.dataSource ? te("dataSource", family.dataSource) : "",
    family.internalNotes ?? "",
    family.verificationNotes ?? "",
    te("governorate", family.governorate),
    family.areaGeneral ?? "",
    String(family.familySize),
    String(family.childrenCount),
    String(family.womenCount),
    String(family.elderlyCount),
    te("caseCategory", family.caseCategory),
    te("priorityLevel", family.priorityLevel),
    String(family.monthlyRequiredAmount),
    String(family.monthlyCoveredAmount),
    String(family.monthlyRemainingAmount),
    te("housingStatus", family.housingStatus),
    te("incomeStatus", family.incomeStatus),
    te("displacementStatus", family.displacementStatus),
    boolLabel(family.hasWidow, t),
    boolLabel(family.hasOrphans, t),
    boolLabel(family.hasDisabledMember, t),
    boolLabel(family.hasChronicPatient, t),
    family.publicStory ?? "",
    te("profileStatus", family.profileStatus),
    te("coverageStatus", family.coverageStatus),
    boolLabel(family.isPilotFamily, t),
    String(family.pilotBatchNumber),
    family.pilotNotes ?? "",
    boolLabel(family.familyLoginEnabled, t),
    family.accountStatus ? te("accountStatus", family.accountStatus) : "",
    family.accountRestricted
      ? t("filters.accountRestricted")
      : t("filters.accountActive"),
    new Date(family.createdAt).toLocaleString(),
    new Date(family.updatedAt).toLocaleString(),
  ]);

  downloadCsv(
    `families-full-${new Date().toISOString().slice(0, 10)}.csv`,
    headers,
    rows,
  );
}
