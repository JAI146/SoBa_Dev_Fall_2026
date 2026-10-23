export const IDLE_WARNING_MS = 10 * 60 * 1000;
export const IDLE_LOGOUT_MS = 12 * 60 * 1000;
export const SIGNED_OUT_EVENT = "purposemint:signed-out";
export const SIGNED_OUT_KEY = "purposemint_signed_out";

export const activityKey = (userId: string) => `purposemint_activity:${userId}`;

export function idleState(lastActivity: number, now: number) {
  const elapsed = Math.max(0, now - lastActivity);
  return {
    warning: elapsed >= IDLE_WARNING_MS,
    expired: elapsed >= IDLE_LOGOUT_MS,
    secondsRemaining: Math.max(0, Math.ceil((IDLE_LOGOUT_MS - elapsed) / 1000)),
  };
}
