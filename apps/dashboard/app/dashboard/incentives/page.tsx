/**
 * Mounts the incentives workspace with a loading boundary for URL-based filters.
 */
import { Suspense } from "react";
import { IncentivesPage } from "@/features/incentives/incentives-page";
export default function Page() {
  return (
    <Suspense fallback={<p>Loading incentives…</p>}>
      <IncentivesPage />
    </Suspense>
  );
}
