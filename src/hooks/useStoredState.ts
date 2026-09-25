import { useCallback, useMemo, useSyncExternalStore } from "react";
import { readRaw, subscribeStored, writeStored } from "../lib/storage";

function parse<T>(raw: string | null, fallbackJson: string): T {
  if (raw !== null) {
    try {
      return JSON.parse(raw) as T;
    } catch {
      // fall back below
    }
  }
  return JSON.parse(fallbackJson) as T;
}

/**
 * useState backed by localStorage, shared by every component using the same
 * key (and by other open tabs). `fallback` must be JSON-serialisable.
 */
export function useStoredState<T>(key: string, fallback: T): [T, (next: T | ((previous: T) => T)) => void] {
  const fallbackJson = JSON.stringify(fallback);
  const subscribe = useCallback((listener: () => void) => subscribeStored(key, listener), [key]);
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(key),
    () => null,
  );

  const value = useMemo(() => parse<T>(raw, fallbackJson), [raw, fallbackJson]);

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previous = parse<T>(readRaw(key), fallbackJson);
      const resolved = typeof next === "function" ? (next as (previous: T) => T)(previous) : next;
      writeStored(key, resolved);
    },
    [key, fallbackJson],
  );

  return [value, setValue];
}
