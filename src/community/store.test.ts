import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  ensureUser: vi.fn(() => Promise.resolve({ uid: "me" })),
  watchCounts: vi.fn(() => () => {}),
  watchMyReactions: vi.fn(() => () => {}),
  watchThread: vi.fn(() => () => {}),
  newCommentId: vi.fn(() => "note-1"),
  postComment: vi.fn(() => Promise.resolve()),
  getCommentPhoto: vi.fn(() => Promise.resolve(new Blob(["from the server"]))),
}));

vi.mock("./config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./config")>()),
  communityEnabled: true,
}));
vi.mock("./firebase", () => api);

const { loadCommentPhoto, useThread } = await import("./store");

const photo = { blob: new Blob(["picked"], { type: "image/jpeg" }), width: 960, height: 1280 };
// Which blob each object URL was made from.
const made = new Map<string, Blob>();
let clock = Date.now();

beforeEach(() => {
  vi.clearAllMocks();
  let count = 0;
  URL.createObjectURL = vi.fn((blob: Blob) => {
    const url = `blob:test-${++count}`;
    made.set(url, blob);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
  // Each test posts well after the last one, so the posting cooldown never applies.
  clock += 60_000;
  vi.spyOn(Date, "now").mockReturnValue(clock);
});

describe("posting a note with a photo", () => {
  it("shows your own photo from the copy you picked, since the server doesn't have it yet", async () => {
    const { result } = renderHook(() => useThread("recipe:apple-pie"));
    await act(() => result.current.post("Aunt Sue ", "", photo));
    expect(api.postComment).toHaveBeenCalledWith(
      "me",
      "note-1",
      { threadId: "recipe:apple-pie", name: "Aunt Sue", body: "" },
      photo,
    );
    expect(made.get(await loadCommentPhoto("note-1"))).toBe(photo.blob);
    expect(api.getCommentPhoto).not.toHaveBeenCalled();
  });

  it("lets go of that copy if the note doesn't post", async () => {
    api.newCommentId.mockReturnValueOnce("note-2");
    api.postComment.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useThread("recipe:apple-pie"));
    await expect(act(() => result.current.post("Aunt Sue", "", photo))).rejects.toThrow("offline");
    await vi.waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test-1"));
    await loadCommentPhoto("note-2");
    expect(api.getCommentPhoto).toHaveBeenCalledWith("note-2");
  });
});

describe("loading someone else's photo", () => {
  it("fetches it once, then reuses it", async () => {
    const first = await loadCommentPhoto("note-3");
    expect(await loadCommentPhoto("note-3")).toBe(first);
    expect(api.getCommentPhoto).toHaveBeenCalledTimes(1);
  });

  it("tries again after a failed load", async () => {
    api.getCommentPhoto.mockRejectedValueOnce(new Error("offline"));
    await expect(loadCommentPhoto("note-4")).rejects.toThrow("offline");
    await expect(loadCommentPhoto("note-4")).resolves.toMatch(/^blob:/);
    expect(api.getCommentPhoto).toHaveBeenCalledTimes(2);
  });
});
