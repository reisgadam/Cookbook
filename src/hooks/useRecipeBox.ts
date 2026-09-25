import { useCallback } from "react";
import { useStoredState } from "./useStoredState";

/** Recipes saved to "My Recipe Box" on this device, most recent first. */
export function useRecipeBox() {
  const [saved, setSaved] = useStoredState<string[]>("recipe-box", []);

  const isSaved = useCallback((slug: string) => saved.includes(slug), [saved]);

  const toggle = useCallback(
    (slug: string): boolean => {
      const willSave = !saved.includes(slug);
      setSaved((current) => (willSave ? [slug, ...current.filter((s) => s !== slug)] : current.filter((s) => s !== slug)));
      return willSave;
    },
    [saved, setSaved],
  );

  return { saved, isSaved, toggle };
}

const RECENT_LIMIT = 12;

/** Recently opened recipes on this device, most recent first. */
export function useRecentlyViewed() {
  const [recent, setRecent] = useStoredState<string[]>("recently-viewed", []);

  const record = useCallback(
    (slug: string) => setRecent((current) => [slug, ...current.filter((s) => s !== slug)].slice(0, RECENT_LIMIT)),
    [setRecent],
  );

  const clear = useCallback(() => setRecent([]), [setRecent]);

  return { recent, record, clear };
}
