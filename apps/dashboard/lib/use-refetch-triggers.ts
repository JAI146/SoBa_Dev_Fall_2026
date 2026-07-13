"use client";

import { useEffect } from "react";
import { onSponsorshipChanged } from "./sponsorship-events";

/** Refetch when the tab regains focus or a sponsorship is stopped/approved. */
export function useRefetchTriggers(refetch: () => void) {
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        refetch();
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    const unsubscribe = onSponsorshipChanged(refetch);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      unsubscribe();
    };
  }, [refetch]);
}
