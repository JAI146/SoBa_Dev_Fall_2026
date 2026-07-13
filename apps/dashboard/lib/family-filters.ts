import type { FamilyListItem } from "@muakhah/contracts";

export type FamilyFilters = {
  search: string;
  governorate: string;
  caseCategory: string;
  priorityLevel: string;
  profileStatus: string;
  accountAccess: string;
};

export const EMPTY_FAMILY_FILTERS: FamilyFilters = {
  search: "",
  governorate: "",
  caseCategory: "",
  priorityLevel: "",
  profileStatus: "",
  accountAccess: "",
};

export function hasActiveFamilyFilters(filters: FamilyFilters) {
  return Object.values(filters).some((value) => value !== "");
}

export function filterFamilies<T extends FamilyListItem>(
  families: T[],
  filters: FamilyFilters,
): T[] {
  return families.filter((family) => {
    if (filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      const haystack = [
        family.publicCode,
        family.headOfFamilyName,
        family.accountEmail,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.governorate && family.governorate !== filters.governorate) {
      return false;
    }
    if (filters.caseCategory && family.caseCategory !== filters.caseCategory) {
      return false;
    }
    if (filters.priorityLevel && family.priorityLevel !== filters.priorityLevel) {
      return false;
    }
    if (filters.profileStatus && family.profileStatus !== filters.profileStatus) {
      return false;
    }
    if (filters.accountAccess === "restricted" && !family.accountRestricted) {
      return false;
    }
    if (filters.accountAccess === "active" && family.accountRestricted) {
      return false;
    }
    return true;
  });
}
