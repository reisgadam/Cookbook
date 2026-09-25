import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

/**
 * Open/closed state for a menu or popover that closes on outside click,
 * Escape (returning focus to its button) and navigation.
 */
export function useDisclosure<T extends HTMLElement = HTMLDivElement>() {
  const [open, setOpen] = useState(false);
  const ref = useRef<T>(null);
  const location = useLocation();
  const [lastLocation, setLastLocation] = useState(location.key);

  // Close whenever the route changes (reset during render, not in an effect).
  if (lastLocation !== location.key) {
    setLastLocation(location.key);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      ref.current?.querySelector<HTMLElement>("[aria-expanded]")?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);

  return { open, toggle, close, ref };
}
