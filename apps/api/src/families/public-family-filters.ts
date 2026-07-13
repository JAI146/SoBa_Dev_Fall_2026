import type { PublicFamilyQuery } from "@muakhah/contracts";
import type { Family } from "../entities/family.entity";
import type { Sponsorship } from "../entities/sponsorship.entity";
import { SponsorshipStatusEnum } from "../entities/sponsorship.entity";

const RECENT_UPDATE_DAYS = 30;
const ENDING_SOON_DAYS = 30;

function computeCoveragePercent(family: Family): number {
  const required = Number(family.monthlyRequiredAmount);
  const remaining = Number(family.monthlyRemainingAmount);
  if (required <= 0) return 0;
  const covered = required - remaining;
  return Math.min(100, Math.max(0, Math.round((covered / required) * 100)));
}

function sponsorshipEndsAt(sponsorship: Sponsorship): Date | null {
  if (
    sponsorship.status !== SponsorshipStatusEnum.ACTIVE ||
    sponsorship.isOngoing ||
    !sponsorship.activatedAt ||
    !sponsorship.durationMonths
  ) {
    return null;
  }

  const end = new Date(sponsorship.activatedAt);
  end.setMonth(end.getMonth() + sponsorship.durationMonths);
  return end;
}

function isSponsorshipEndingSoon(sponsorship: Sponsorship): boolean {
  const end = sponsorshipEndsAt(sponsorship);
  if (!end) return false;

  const now = Date.now();
  const diffDays = (end.getTime() - now) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= ENDING_SOON_DAYS;
}

function hasFiniteActiveSponsorship(sponsorships: Sponsorship[]): boolean {
  return sponsorships.some(
    (item) =>
      item.status === SponsorshipStatusEnum.ACTIVE &&
      !item.isOngoing &&
      item.durationMonths != null &&
      item.durationMonths > 0,
  );
}

function isFamilyFullyCovered(family: Family): boolean {
  const required = Number(family.monthlyRequiredAmount);
  const covered = Number(family.monthlyCoveredAmount);
  const remaining = Number(family.monthlyRemainingAmount);

  if (required > 0 && remaining <= 0) return true;
  if (required > 0 && covered >= required) return true;
  return false;
}

function matchesFamilySizeRange(
  familySize: number,
  range: NonNullable<PublicFamilyQuery["familySizeRange"]>,
): boolean {
  switch (range) {
    case "1_3":
      return familySize >= 1 && familySize <= 3;
    case "4_6":
      return familySize >= 4 && familySize <= 6;
    case "7_9":
      return familySize >= 7 && familySize <= 9;
    case "10_plus":
      return familySize >= 10;
    default:
      return true;
  }
}

function matchesChildrenCountRange(
  childrenCount: number,
  range: NonNullable<PublicFamilyQuery["childrenCountRange"]>,
): boolean {
  switch (range) {
    case "none":
      return childrenCount === 0;
    case "1_2":
      return childrenCount >= 1 && childrenCount <= 2;
    case "3_5":
      return childrenCount >= 3 && childrenCount <= 5;
    case "6_plus":
      return childrenCount >= 6;
    default:
      return true;
  }
}

function matchesMonthlyAmountRange(
  monthlyRequiredAmount: number,
  range: NonNullable<PublicFamilyQuery["monthlyAmountRange"]>,
): boolean {
  switch (range) {
    case "up_to_50":
      return monthlyRequiredAmount <= 50;
    case "51_100":
      return monthlyRequiredAmount >= 51 && monthlyRequiredAmount <= 100;
    case "101_200":
      return monthlyRequiredAmount >= 101 && monthlyRequiredAmount <= 200;
    case "over_200":
      return monthlyRequiredAmount > 200;
    default:
      return true;
  }
}

function matchesCoveragePercentRange(
  coveragePercent: number,
  range: NonNullable<PublicFamilyQuery["coveragePercentRange"]>,
): boolean {
  switch (range) {
    case "0":
      return coveragePercent === 0;
    case "under_25":
      return coveragePercent > 0 && coveragePercent < 25;
    case "25_50":
      return coveragePercent >= 25 && coveragePercent <= 50;
    case "50_75":
      return coveragePercent > 50 && coveragePercent <= 75;
    case "over_75":
      return coveragePercent > 75;
    default:
      return true;
  }
}

function matchesSponsorshipCoverage(
  family: Family,
  filter: NonNullable<PublicFamilyQuery["sponsorshipCoverage"]>,
  sponsorships: Sponsorship[],
): boolean {
  const covered = Number(family.monthlyCoveredAmount);
  const remaining = Number(family.monthlyRemainingAmount);
  const fullyCovered = isFamilyFullyCovered(family);

  switch (filter) {
    case "not_sponsored":
      return covered <= 0;
    case "partially_sponsored":
      return covered > 0 && remaining > 0 && !fullyCovered;
    case "needs_additional_sponsor":
      return remaining > 0;
    case "fully_covered_temporarily":
      return (
        fullyCovered &&
        hasFiniteActiveSponsorship(sponsorships)
      );
    case "ending_soon":
      return sponsorships.some(isSponsorshipEndingSoon);
    default:
      return true;
  }
}

function matchesMediaAvailability(
  family: Family,
  filter: NonNullable<PublicFamilyQuery["mediaAvailability"]>,
): boolean {
  const mediaItems = family.mediaItems ?? [];
  const updatedAt = family.updatedAt.getTime();
  const recentThreshold =
    Date.now() - RECENT_UPDATE_DAYS * 24 * 60 * 60 * 1000;

  switch (filter) {
    case "has_images":
      return mediaItems.some((item) => item.kind === "image");
    case "has_video":
      return mediaItems.some((item) => item.kind === "video");
    case "has_recent_updates":
      return updatedAt >= recentThreshold;
    default:
      return true;
  }
}

export function shouldIncludeFullySponsoredFamily(
  query: PublicFamilyQuery,
): boolean {
  return query.sponsorshipCoverage === "fully_covered_temporarily";
}

export function needsActiveSponsorships(query: PublicFamilyQuery): boolean {
  return (
    query.sponsorshipCoverage === "fully_covered_temporarily" ||
    query.sponsorshipCoverage === "ending_soon"
  );
}

export function matchesPublicFamilyQuery(
  family: Family,
  query: PublicFamilyQuery,
  sponsorships: Sponsorship[] = [],
): boolean {
  const search = query.search?.trim().toLowerCase();
  if (search) {
    const haystack = [
      family.publicCode,
      family.areaGeneral,
      family.areaGeneralAr,
      family.publicStory,
      family.publicStoryAr,
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    if (!haystack.some((value) => value.includes(search))) {
      return false;
    }
  }

  if (query.governorate && family.governorate !== query.governorate) {
    return false;
  }

  if (
    query.familySizeRange &&
    !matchesFamilySizeRange(family.familySize, query.familySizeRange)
  ) {
    return false;
  }

  if (
    query.childrenCountRange &&
    !matchesChildrenCountRange(family.childrenCount, query.childrenCountRange)
  ) {
    return false;
  }

  if (query.caseCategory && family.caseCategory !== query.caseCategory) {
    return false;
  }

  if (query.priorityLevel && family.priorityLevel !== query.priorityLevel) {
    return false;
  }

  if (query.receivingMethod) {
    const methods = family.receivingMethods ?? [];
    if (!methods.some((method) => method.method === query.receivingMethod)) {
      return false;
    }
  }

  if (
    query.monthlyAmountRange &&
    !matchesMonthlyAmountRange(
      Number(family.monthlyRequiredAmount),
      query.monthlyAmountRange,
    )
  ) {
    return false;
  }

  const coveragePercent = computeCoveragePercent(family);
  if (
    query.coveragePercentRange &&
    !matchesCoveragePercentRange(coveragePercent, query.coveragePercentRange)
  ) {
    return false;
  }

  if (query.mediaAvailability) {
    if (!matchesMediaAvailability(family, query.mediaAvailability)) {
      return false;
    }
  }

  if (query.sponsorshipCoverage) {
    if (
      !matchesSponsorshipCoverage(
        family,
        query.sponsorshipCoverage,
        sponsorships,
      )
    ) {
      return false;
    }
  }

  return true;
}
