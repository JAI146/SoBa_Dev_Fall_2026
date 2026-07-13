import type { SponsorshipListItem } from "@muakhah/contracts";

export type DonorSponsorshipFilters = {
  family: string;
  status: string;
  type: string;
  durationMin: string;
  durationMax: string;
  submittedFrom: string;
  submittedTo: string;
  amountMin: string;
  amountMax: string;
};

export const EMPTY_DONOR_SPONSORSHIP_FILTERS: DonorSponsorshipFilters = {
  family: "",
  status: "",
  type: "",
  durationMin: "",
  durationMax: "",
  submittedFrom: "",
  submittedTo: "",
  amountMin: "",
  amountMax: "",
};

export function hasActiveDonorSponsorshipFilters(
  filters: DonorSponsorshipFilters,
) {
  return Object.values(filters).some((value) => value !== "");
}

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function filterDonorSponsorships(
  sponsorships: SponsorshipListItem[],
  filters: DonorSponsorshipFilters,
): SponsorshipListItem[] {
  const durationMin = parseOptionalNumber(filters.durationMin);
  const durationMax = parseOptionalNumber(filters.durationMax);
  const amountMin = parseOptionalNumber(filters.amountMin);
  const amountMax = parseOptionalNumber(filters.amountMax);
  const submittedFrom = filters.submittedFrom
    ? startOfDay(new Date(filters.submittedFrom))
    : null;
  const submittedTo = filters.submittedTo
    ? endOfDay(new Date(filters.submittedTo))
    : null;

  return sponsorships.filter((item) => {
    if (filters.family && item.familyPublicCode !== filters.family) {
      return false;
    }
    if (filters.status) {
      if (filters.status === "need_clarification") {
        if (!(item.status === "requested" && item.needsClarification)) {
          return false;
        }
      } else if (item.status !== filters.status) {
        return false;
      }
    }
    if (filters.type && item.type !== filters.type) {
      return false;
    }
    if (!item.isOngoing && durationMin !== null && (item.durationMonths ?? 0) < durationMin) {
      return false;
    }
    if (!item.isOngoing && durationMax !== null && (item.durationMonths ?? 0) > durationMax) {
      return false;
    }
    if (amountMin !== null && item.monthlyAmount < amountMin) {
      return false;
    }
    if (amountMax !== null && item.monthlyAmount > amountMax) {
      return false;
    }

    if (submittedFrom || submittedTo) {
      const submittedAt = new Date(item.createdAt);
      if (submittedFrom && submittedAt < submittedFrom) {
        return false;
      }
      if (submittedTo && submittedAt > submittedTo) {
        return false;
      }
    }

    return true;
  });
}

export function uniqueFamilyCodes(
  sponsorships: SponsorshipListItem[],
): string[] {
  return [...new Set(sponsorships.map((item) => item.familyPublicCode))].sort();
}
