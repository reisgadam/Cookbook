import { useEffect, useState } from "react";

/** "off" means the browser can't or won't keep the screen on. */
export type WakeLockStatus = "requesting" | "on" | "off";

const supported = () => typeof navigator !== "undefined" && "wakeLock" in navigator;

/**
 * Keeps the screen from dimming while `active` (cook mode). The lock is
 * dropped whenever the tab is hidden, so it is re-requested on return.
 */
export function useWakeLock(active: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>(supported() ? "requesting" : "off");

  useEffect(() => {
    if (!active || !supported()) return;
    let sentinel: WakeLockSentinel | undefined;
    let cancelled = false;

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        setStatus("on");
        sentinel.addEventListener("release", () => {
          if (!cancelled) setStatus("requesting");
        });
      } catch {
        // Refused, for example in battery saver mode.
        if (!cancelled) setStatus("off");
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);

  return status;
}
