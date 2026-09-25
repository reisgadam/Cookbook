// Per-device conveniences (saved recipes, theme, checklists) live in
// localStorage. It can be missing or throw in private browsing or when site
// data is blocked, so every access is guarded, with an in-memory fallback so
// the page keeps working for the visit.

const PREFIX = "moms-recipes:";
const memory = new Map<string, string>();
const listeners = new Map<string, Set<() => void>>();

function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function readRaw(key: string): string | null {
  const full = PREFIX + key;
  try {
    const value = storage()?.getItem(full);
    if (value !== null && value !== undefined) return value;
  } catch {
    // fall through to memory
  }
  return memory.get(full) ?? null;
}

export function readStored<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStored<T>(key: string, value: T): void {
  const full = PREFIX + key;
  const raw = JSON.stringify(value);
  memory.set(full, raw);
  try {
    storage()?.setItem(full, raw);
  } catch {
    // quota or privacy mode: the memory copy still works for this visit
  }
  notify(key);
}

export function removeStored(key: string): void {
  const full = PREFIX + key;
  memory.delete(full);
  try {
    storage()?.removeItem(full);
  } catch {
    // ignore
  }
  notify(key);
}

export function subscribeStored(key: string, listener: () => void): () => void {
  const set = listeners.get(key) ?? new Set();
  set.add(listener);
  listeners.set(key, set);
  return () => set.delete(listener);
}

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

// Keep other tabs in sync.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key?.startsWith(PREFIX)) notify(event.key.slice(PREFIX.length));
  });
}
