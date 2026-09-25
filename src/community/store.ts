import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useOnline } from "../hooks/useOnline";
import { communityEnabled, LIMITS, type ReactionKind } from "./config";
import type { Comment } from "./firebase";
import type { PreparedPhoto } from "./photo";

type Api = typeof import("./firebase");

export type CommunityStatus = "off" | "idle" | "loading" | "ready" | "error";

export interface CommunityState {
  status: CommunityStatus;
  /** "love:apple-pie" → number of hearts. */
  counts: Record<string, number>;
  /** Reactions made from this browser, as "kind:slug" keys. */
  mine: ReadonlySet<string>;
  uid?: string;
}

let state: CommunityState = { status: communityEnabled ? "idle" : "off", counts: {}, mine: new Set() };
const listeners = new Set<() => void>();

function update(patch: Partial<CommunityState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

let loading: Promise<{ api: Api; uid: string }> | undefined;

/** Loads Firebase, signs the visitor in anonymously, and starts listening. */
export function loadCommunity(): Promise<{ api: Api; uid: string }> {
  if (!communityEnabled) return Promise.reject(new Error("Community features are not configured"));
  loading ??= (async () => {
    update({ status: "loading" });
    const api = await import("./firebase");
    const user = await api.ensureUser();
    const fail = () => update({ status: "error" });
    api.watchCounts((counts) => update({ counts }), fail);
    api.watchMyReactions(
      user.uid,
      (keys) => update({ mine: new Set(keys) }),
      () => {},
    );
    update({ status: "ready", uid: user.uid });
    retries = 0;
    return { api, uid: user.uid };
  })().catch((error) => {
    loading = undefined;
    update({ status: "error" });
    retryLater();
    throw error;
  });
  return loading;
}

let retries = 0;

/** Usually the connection dropped while starting up, so try again once it's back. */
function retryLater() {
  const retry = () => void loadCommunity().catch(() => {});
  if (!navigator.onLine) window.addEventListener("online", retry, { once: true });
  else if (retries < 3) setTimeout(retry, 5000 * 2 ** retries++);
}

/** Calls back once Firebase has started. Returns a function that cancels. */
function whenReady(callback: () => void): () => void {
  const listener = () => {
    if (state.status !== "ready") return;
    listeners.delete(listener);
    callback();
  };
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function whenIdle(callback: () => void) {
  if ("requestIdleCallback" in window) window.requestIdleCallback(callback, { timeout: 2500 });
  else setTimeout(callback, 800);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (state.status === "idle") whenIdle(() => void loadCommunity().catch(() => {}));
  return () => {
    listeners.delete(listener);
  };
}

/** Counts and this browser's reactions; starts Firebase after the page settles. */
export function useCommunity(): CommunityState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export const reactionKey = (kind: ReactionKind, slug: string) => `${kind}:${slug}`;

/** Flips a heart or "I made this", updating the screen right away. */
export async function toggleReaction(kind: ReactionKind, slug: string): Promise<boolean> {
  const key = reactionKey(kind, slug);
  const { api, uid } = await loadCommunity();
  const on = !state.mine.has(key);
  const before = { mine: state.mine, counts: state.counts };
  const mine = new Set(state.mine);
  if (on) mine.add(key);
  else mine.delete(key);
  update({ mine, counts: { ...state.counts, [key]: Math.max(0, (state.counts[key] ?? 0) + (on ? 1 : -1)) } });
  try {
    await api.setReaction(uid, kind, slug, on);
    return on;
  } catch (error) {
    update(before);
    throw error;
  }
}

export type ThreadStatus = "off" | "loading" | "ready" | "error";

let lastPostAt = 0;

/** Live notes for one thread (a recipe, or the guestbook). */
export function useThread(threadId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [status, setStatus] = useState<ThreadStatus>(communityEnabled ? "loading" : "off");
  const { uid } = useCommunity();
  // While offline, keep showing the notes already loaded and reconnect later.
  const online = useOnline();

  useEffect(() => {
    if (!communityEnabled || !online) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    const start = () =>
      loadCommunity()
        .then(({ api }) => {
          if (cancelled) return;
          stop = api.watchThread(
            threadId,
            (list) => {
              setComments(list);
              setStatus("ready");
            },
            () => setStatus("error"),
          );
        })
        .catch(() => {
          if (cancelled) return;
          setStatus("error");
          // Firebase tries to start again by itself (see retryLater); follow it.
          stop = whenReady(start);
        });
    start();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [threadId, online]);

  const post = useCallback(
    async (name: string, body: string, photo?: PreparedPhoto) => {
      const wait = Math.ceil((lastPostAt + LIMITS.cooldownSeconds * 1000 - Date.now()) / 1000);
      if (wait > 0) throw new CooldownError(wait);
      const { api, uid } = await loadCommunity();
      const id = api.newCommentId();
      // Your note shows up before the server has it, so its photo can't be
      // fetched yet. Show the copy you picked instead.
      if (photo) showOwnPhoto(id, photo.blob);
      try {
        await api.postComment(uid, id, { threadId, name: name.trim(), body: body.trim() }, photo);
      } catch (error) {
        forgetCommentPhoto(id);
        throw error;
      }
      lastPostAt = Date.now();
    },
    [threadId],
  );

  const remove = useCallback(async (id: string, hasPhoto: boolean) => {
    const { api } = await loadCommunity();
    await api.deleteComment(id, hasPhoto);
    forgetCommentPhoto(id);
  }, []);

  return { status, comments, post, remove, uid };
}

// Photos are fetched once per page visit and shown from memory after that.
const photoUrls = new Map<string, Promise<string>>();

/** The address of a note's photo, loading it the first time it's asked for. */
export function loadCommentPhoto(id: string): Promise<string> {
  let url = photoUrls.get(id);
  if (!url) {
    url = loadCommunity()
      .then(({ api }) => api.getCommentPhoto(id))
      .then((blob) => URL.createObjectURL(blob));
    // A failed load (say, while offline) can be tried again later.
    url.catch(() => photoUrls.delete(id));
    photoUrls.set(id, url);
  }
  return url;
}

function showOwnPhoto(id: string, blob: Blob) {
  photoUrls.set(id, Promise.resolve(URL.createObjectURL(blob)));
}

function forgetCommentPhoto(id: string) {
  void photoUrls.get(id)?.then(
    (url) => URL.revokeObjectURL(url),
    () => {},
  );
  photoUrls.delete(id);
}

export class CooldownError extends Error {
  constructor(readonly seconds: number) {
    super(`Please wait ${seconds} seconds before posting again.`);
  }
}
