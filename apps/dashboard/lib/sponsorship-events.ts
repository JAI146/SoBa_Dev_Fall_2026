const SPONSORSHIP_CHANGED = "muakhah:sponsorship-changed";

export function notifySponsorshipChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SPONSORSHIP_CHANGED));
  }
}

export function onSponsorshipChanged(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(SPONSORSHIP_CHANGED, callback);
  return () => window.removeEventListener(SPONSORSHIP_CHANGED, callback);
}
