import type { SponsorshipListItem } from "@muakhah/contracts";

export type FamilyDonorFilters = {
  search: string;
  status: string;
  type: string;
  durationMin: string;
  durationMax: string;
  submittedFrom: string;
  submittedTo: string;
  amountMin: string;
  amountMax: string;
};

export const EMPTY_FAMILY_DONOR_FILTERS: FamilyDonorFilters = {
  search: "",
  status: "",
  type: "",
  durationMin: "",
  durationMax: "",
  submittedFrom: "",
  submittedTo: "",
  amountMin: "",
  amountMax: "",
};

export function hasActiveFamilyDonorFilters(filters: FamilyDonorFilters) {
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

function matchesSearch(item: SponsorshipListItem, search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return (
    item.donorName.toLowerCase().includes(term) ||
    item.donorEmail.toLowerCase().includes(term)
  );
}

export function filterFamilyDonors(
  sponsorships: SponsorshipListItem[],
  filters: FamilyDonorFilters,
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
    if (!matchesSearch(item, filters.search)) {
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
    if (durationMin !== null && (item.durationMonths ?? 0) < durationMin) {
      return false;
    }
    if (durationMax !== null && (item.durationMonths ?? 0) > durationMax) {
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
