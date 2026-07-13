import type { SponsorshipListItem } from "@muakhah/contracts";

export function formatSponsorshipDuration(
  sponsorship: Pick<
    SponsorshipListItem,
    "durationPreset" | "isOngoing" | "durationMonths"
  >,
  t: (key: string) => string,
): string {
  if (sponsorship.isOngoing) {
    return t("sponsorships.durationPresets.ongoing");
  }
  return t(`sponsorships.durationPresets.${sponsorship.durationPreset}`);
}
