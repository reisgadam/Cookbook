import { useEffect, useSyncExternalStore } from "react";
import { useStoredState } from "./useStoredState";

export type ThemePreference = "light" | "dark" | "system";

/** Reader text sizes, from A− to A++. The first is 90%, the default 100%. */
export const TEXT_SCALES = [0.9, 1, 1.15, 1.3] as const;
export type TextScale = (typeof TEXT_SCALES)[number];

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeToSystemTheme(listener: () => void) {
  const query = window.matchMedia?.(DARK_QUERY);
  query?.addEventListener("change", listener);
  return () => query?.removeEventListener("change", listener);
}

export function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(
    subscribeToSystemTheme,
    () => window.matchMedia?.(DARK_QUERY).matches ?? false,
    () => false,
  );
}

export function useThemePreference() {
  return useStoredState<ThemePreference>("theme", "system");
}

export function useTextScale() {
  return useStoredState<TextScale>("text-scale", 1);
}

/** Applies the reader's theme and text size to <html>. Mounted once, in Layout. */
export function useApplyPreferences(): void {
  const [theme] = useThemePreference();
  const [scale] = useTextScale();
  const systemDark = useSystemPrefersDark();
  const resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    const color = getComputedStyle(root).getPropertyValue("--paper").trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color || "#fbf6ee");
  }, [resolved]);

  useEffect(() => {
    const root = document.documentElement;
    if (scale === 1) root.style.removeProperty("--text-scale");
    else root.style.setProperty("--text-scale", String(scale));
  }, [scale]);
}
