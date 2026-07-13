"use client";

import type { FamilyPublicProfile } from "@muakhah/contracts";
import { useI18n } from "@muakhah/i18n";
import {
  FamilyCard,
  familyCoveragePercent,
  familyCoverageStatusKey,
  type FamilyCardLabels,
} from "@muakhah/ui/family-card";
import { buildLandingUrl } from "@/lib/landing-links";

type FamilyPublicCardProps = { family: FamilyPublicProfile };

export function FamilyPublicCard({ family }: FamilyPublicCardProps) {
  const { t, locale } = useI18n();
  const area = locale === "ar" && family.areaGeneralAr ? family.areaGeneralAr : family.areaGeneral;
  const governorate = t(`enums.governorate.${family.governorate}`);
  const region = area ? `${governorate} - ${area}` : governorate;
  const familyPath = `/browse-families/${encodeURIComponent(family.publicCode)}`;
  const formatUsd = (amount: number) => new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(amount);
  const labels: FamilyCardLabels = {
    generalRegion: t("landing.families.generalRegion"),
    familySize: t("landing.families.familySize"),
    children: t("landing.families.childrenCount"),
    caseCategory: t("landing.families.caseCategory"),
    priorityLevel: t("landing.families.priorityLevel"),
    monthlyRequired: t("landing.families.monthlyRequired"),
    coveredAmount: t("landing.families.card.coveredAmount"),
    remainingAmount: t("landing.families.monthlyRemaining"),
    coverage: t("landing.families.coverage"),
    availableReceivingMethods: t("landing.families.card.availableReceivingMethods"),
    coverageStatus: t("landing.families.card.coverageStatus"),
    lastUpdate: t("landing.families.card.lastUpdate"),
    sensitiveContent: t("landing.families.sensitiveContent"),
    blurredHint: t("landing.families.card.blurredHint"),
    revealMedia: t("landing.families.clickToUnblur"),
  };

  return (
    <FamilyCard
      publicCode={family.publicCode}
      region={region}
      familySize={family.familySize}
      childrenCount={family.childrenCount}
      caseCategory={t(`enums.caseCategory.${family.caseCategory}`)}
      priorityLevel={t(`enums.priorityLevel.${family.priorityLevel}`)}
      monthlyRequired={formatUsd(family.monthlyRequiredAmount)}
      monthlyCovered={formatUsd(family.monthlyCoveredAmount)}
      monthlyRemaining={formatUsd(family.monthlyRemainingAmount)}
      coveragePercent={familyCoveragePercent(family.monthlyRequiredAmount, family.monthlyRemainingAmount)}
      coverageStatus={t(`landing.families.filters.sponsorshipCoverageOptions.${familyCoverageStatusKey(family)}`)}
      lastUpdate={new Date(family.updatedAt).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}
      receivingMethods={family.receivingMethods.map((method) => ({ id: method.method, label: t(`families.receivingMethods.${method.method}`) }))}
      mediaItems={family.mediaItems}
      labels={labels}
      viewDetailsAction={{ href: buildLandingUrl(familyPath), label: t("landing.families.card.viewDetails") }}
      primaryAction={{ href: buildLandingUrl(`${familyPath}?sponsorship=full`), label: t("landing.families.card.startSponsorship") }}
    />
  );
}
