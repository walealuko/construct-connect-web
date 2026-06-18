"use client";

import { useEffect, useRef } from "react";

interface AuthIdleTimerProps {
  /** Idle duration in milliseconds before onTimeout fires. */
  idleMs: number;
  /** Called once when the idle deadline is reached. */
  onTimeout: () => void;
  /**
   * Event names that count as "activity" and reset the timer.
   * Defaults cover mouse, keyboard, scroll, and touch.
   */
  activityEvents?: string[];
}

const DEFAULT_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "wheel",
] as const;

const ACTIVITY_THROTTLE_MS = 1000;

/**
 * Headless component. While mounted, it:
 *   1. Resets a timer every time the user is active. If `idleMs` elapses
 *      with no activity, fires `onTimeout` (once).
 *   2. On `pagehide` or `visibilitychange -> hidden`, clears the Supabase
 *      auth tokens from localStorage so closing the tab logs the user out.
 *
 * The component is mounted only when a user is signed in (see UserProvider).
 * On public pages, it isn't mounted, so it does no work.
 */
export default function AuthIdleTimer({
  idleMs,
  onTimeout,
  activityEvents = DEFAULT_EVENTS as unknown as string[],
}: AuthIdleTimerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResetRef = useRef<number>(0);
  const firedRef = useRef<boolean>(false);

  // Clear local Supabase auth tokens. Best-effort — localStorage may be
  // inaccessible (private mode on iOS Safari), in which case we silently
  // skip. Tokens live under keys like "sb-<project-ref>-auth-token".
  const clearLocalSession = () => {
    try {
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      /* ignore — storage unavailable */
    }
  };

  // Start (or restart) the idle timer. Called on mount and on each
  // detected activity event. Throttled so rapid mouse movement doesn't
  // thrash the timer.
  const resetTimer = () => {
    const now = Date.now();
    if (now - lastResetRef.current < ACTIVITY_THROTTLE_MS) return;
    lastResetRef.current = now;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (firedRef.current) return;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onTimeout();
    }, idleMs);
  };

  useEffect(() => {
    // Initial arm.
    resetTimer();

    // Activity listeners. The handler is the same for every event type;
    // we register one listener per event name (cheaper than reading the
    // event type at runtime).
    const handlers: Array<[string, EventListener]> = activityEvents.map(
      (name) => [
        name,
        () => {
          resetTimer();
        },
      ]
    );
    for (const [name, handler] of handlers) {
      window.addEventListener(name, handler, { passive: true });
    }

    // Tab-close / background cleanup. `pagehide` is the reliable one on
    // mobile (fires when the tab is backgrounded on iOS Safari);
    // `visibilitychange -> hidden` is a fallback for desktop browsers.
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        clearLocalSession();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const [name, handler] of handlers) {
        window.removeEventListener(name, handler);
      }
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
    };
    // We intentionally exclude onTimeout from deps — the parent passes a
    // stable callback (a wrapped logout). Re-binding on every render would
    // reset the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleMs]);

  return null;
}
