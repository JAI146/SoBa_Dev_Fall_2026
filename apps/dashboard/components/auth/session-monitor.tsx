"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { activityKey, idleState, SIGNED_OUT_KEY } from "@/lib/session-activity";
import styles from "./session-monitor.module.css";

export function SessionMonitor({
  userId,
  onLogout,
  children,
}: {
  userId: string;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const key = activityKey(userId);
  const [state, setState] = useState(() => idleState(Date.now(), Date.now()));
  const [ended, setEnded] = useState(false);
  const ending = useRef(false);
  const continueButton = useRef<HTMLButtonElement>(null);
  const logoutButton = useRef<HTMLButtonElement>(null);

  const check = useCallback(() => {
    const now = Date.now();
    const saved = Number(localStorage.getItem(key));
    const last = saved > 0 ? Math.min(saved, now) : now;
    if (!saved) localStorage.setItem(key, String(last));
    const next = idleState(last, now);
    setState(next);
    if (next.expired && !ending.current) {
      ending.current = true;
      setEnded(true);
      onLogout();
    }
    return next;
  }, [key, onLogout]);

  useEffect(() => {
    check();
    const interval = window.setInterval(check, 1000);
    function activity(event: Event) {
      if (
        !event.isTrusted ||
        document.visibilityState !== "visible" ||
        ending.current
      )
        return;
      const now = Date.now();
      const last = Number(localStorage.getItem(key)) || now;
      // Once prompted, only the explicit confirmation extends this session.
      if (idleState(last, now).warning) {
        check();
        return;
      }
      if (now - last >= 1000) localStorage.setItem(key, String(now));
    }
    function storage(event: StorageEvent) {
      if (event.key === SIGNED_OUT_KEY) {
        ending.current = true;
        setEnded(true);
        onLogout();
      } else if (event.key === key) check();
    }
    const events = [
      "pointerdown",
      "pointermove",
      "keydown",
      "wheel",
      "touchstart",
    ];
    events.forEach((name) =>
      window.addEventListener(name, activity, { passive: true }),
    );
    window.addEventListener("storage", storage);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(interval);
      events.forEach((name) => window.removeEventListener(name, activity));
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [check, key, onLogout]);

  useEffect(() => {
    if (!state.warning) return;
    const previous = document.activeElement as HTMLElement | null;
    continueButton.current?.focus();
    function trap(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      event.preventDefault();
      if (document.activeElement === continueButton.current)
        logoutButton.current?.focus();
      else continueButton.current?.focus();
    }
    document.addEventListener("keydown", trap, true);
    return () => {
      document.removeEventListener("keydown", trap, true);
      if (previous?.isConnected) previous.focus();
    };
  }, [state.warning]);

  function staySignedIn() {
    if (check().expired || ending.current) return;
    localStorage.setItem(key, String(Date.now()));
    check();
  }

  if (ended)
    return (
      <main className={styles.signingOut} role="status">
        Signing out...
      </main>
    );
  return (
    <>
      <div inert={state.warning}>{children}</div>
      {state.warning && (
        <div className={styles.overlay}>
          <section
            className={styles.dialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="idle-title"
            aria-describedby="idle-description"
          >
            <h2 id="idle-title">Are you still active?</h2>
            <p id="idle-description">
              You have been inactive for 10 minutes. You will be signed out
              unless you choose to stay.
            </p>
            <p
              className={styles.countdown}
              role="timer"
              aria-label="Time until sign out"
            >
              {Math.floor(state.secondsRemaining / 60)}:
              {String(state.secondsRemaining % 60).padStart(2, "0")}
            </p>
            <div className={styles.actions}>
              <button ref={logoutButton} onClick={onLogout}>
                Sign out
              </button>
              <button
                ref={continueButton}
                className={styles.continue}
                onClick={staySignedIn}
              >
                Stay signed in
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
