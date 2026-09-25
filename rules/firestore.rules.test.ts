// Runs against the Firestore emulator: npm run test:rules
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-cookbook",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});

afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const as = (uid: string) => env.authenticatedContext(uid).firestore() as unknown as Firestore;
const anon = () => env.unauthenticatedContext().firestore() as unknown as Firestore;

async function seed(write: (db: Firestore) => Promise<unknown>) {
  await env.withSecurityRulesDisabled((context) => write(context.firestore() as unknown as Firestore));
}

function reactionBatch(db: Firestore, uid: string, slug: string, { on = true, kind = "love", by = 1 } = {}) {
  const key = `${kind}:${slug}`;
  const batch = writeBatch(db);
  const reaction = doc(db, "reactions", `${key}:${uid}`);
  if (on) batch.set(reaction, { kind, slug, uid, createdAt: serverTimestamp() });
  else batch.delete(reaction);
  batch.set(
    doc(db, "counters", "reactions"),
    { [key]: increment(on ? by : -by), last: key },
    { merge: true },
  );
  return batch;
}

async function count(key: string) {
  const snapshot = await getDoc(doc(anon(), "counters", "reactions"));
  return snapshot.data()?.[key] ?? 0;
}

describe("hearts and 'I made this'", () => {
  it("lets a visitor heart a recipe once", async () => {
    await assertSucceeds(reactionBatch(as("alice"), "alice", "apple-pie").commit());
    await assertFails(reactionBatch(as("alice"), "alice", "apple-pie").commit());
    expect(await count("love:apple-pie")).toBe(1);
  });

  it("counts different visitors separately", async () => {
    await assertSucceeds(reactionBatch(as("alice"), "alice", "apple-pie").commit());
    await assertSucceeds(reactionBatch(as("bob"), "bob", "apple-pie").commit());
    await assertSucceeds(reactionBatch(as("bob"), "bob", "apple-pie", { kind: "made" }).commit());
    expect(await count("love:apple-pie")).toBe(2);
    expect(await count("made:apple-pie")).toBe(1);
  });

  it("lets a visitor take a heart back", async () => {
    await assertSucceeds(reactionBatch(as("alice"), "alice", "apple-pie").commit());
    await assertSucceeds(reactionBatch(as("alice"), "alice", "apple-pie", { on: false }).commit());
    expect(await count("love:apple-pie")).toBe(0);
  });

  it("rejects bumping a counter without a reaction", async () => {
    const db = as("mallory");
    await assertFails(
      setDoc(
        doc(db, "counters", "reactions"),
        { "love:apple-pie": increment(1), last: "love:apple-pie" },
        { merge: true },
      ),
    );
  });

  it("rejects adding more than one", async () => {
    await assertFails(reactionBatch(as("mallory"), "mallory", "apple-pie", { by: 5 }).commit());
  });

  it("rejects a reaction that doesn't update the counter", async () => {
    const db = as("mallory");
    await assertFails(
      setDoc(doc(db, "reactions", "love:apple-pie:mallory"), {
        kind: "love",
        slug: "apple-pie",
        uid: "mallory",
        createdAt: serverTimestamp(),
      }),
    );
  });

  it("rejects taking back someone else's heart", async () => {
    await assertSucceeds(reactionBatch(as("alice"), "alice", "apple-pie").commit());
    const db = as("mallory");
    const batch = writeBatch(db);
    batch.delete(doc(db, "reactions", "love:apple-pie:alice"));
    batch.set(
      doc(db, "counters", "reactions"),
      { "love:apple-pie": increment(-1), last: "love:apple-pie" },
      { merge: true },
    );
    await assertFails(batch.commit());
  });

  it("rejects unknown reaction kinds and visitors who aren't signed in", async () => {
    await assertFails(reactionBatch(as("alice"), "alice", "apple-pie", { kind: "hate" }).commit());
    await assertFails(reactionBatch(anon(), "nobody", "apple-pie").commit());
  });

  it("lets anyone read the counts but only you read your reactions", async () => {
    await assertSucceeds(reactionBatch(as("alice"), "alice", "apple-pie").commit());
    await assertSucceeds(getDoc(doc(anon(), "counters", "reactions")));
    await assertSucceeds(getDocs(query(collection(as("alice"), "reactions"), where("uid", "==", "alice"))));
    await assertFails(getDoc(doc(as("bob"), "reactions", "love:apple-pie:alice")));
  });
});

function post(db: Firestore, uid: string, overrides: Record<string, unknown> = {}, { stamp = true } = {}) {
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "comments")), {
    threadId: "recipe:apple-pie",
    name: "Aunt Sue",
    body: "She always doubled the cinnamon.",
    uid,
    createdAt: serverTimestamp(),
    status: "visible",
    ...overrides,
  });
  if (stamp) batch.set(doc(db, "users", uid), { lastPostAt: serverTimestamp() });
  return batch.commit();
}

describe("notes and memories", () => {
  it("lets a visitor post a note, then makes them wait 30 seconds", async () => {
    await assertSucceeds(post(as("alice"), "alice"));
    await assertFails(post(as("alice"), "alice"));
  });

  it("allows posting again once 30 seconds have passed", async () => {
    await seed((db) =>
      setDoc(doc(db, "users", "alice"), { lastPostAt: Timestamp.fromMillis(Date.now() - 60_000) }),
    );
    await assertSucceeds(post(as("alice"), "alice"));
  });

  it("requires the rate-limit stamp", async () => {
    await assertFails(post(as("alice"), "alice", {}, { stamp: false }));
  });

  it("rejects bad notes", async () => {
    await assertFails(post(as("a1"), "a1", { status: "hidden" }));
    await assertFails(post(as("a2"), "a2", { body: "x".repeat(2001) }));
    await assertFails(post(as("a3"), "a3", { body: "" }));
    await assertFails(post(as("a4"), "a4", { name: "" }));
    await assertFails(post(as("a5"), "a5", { threadId: "somewhere-else" }));
    await assertFails(post(as("a6"), "a6", { uid: "someone-else" }));
    await assertFails(post(as("a7"), "a7", { link: "http://spam.example" }));
    await assertFails(post(anon(), "nobody"));
  });

  it("accepts the guestbook thread", async () => {
    await assertSucceeds(post(as("alice"), "alice", { threadId: "guestbook" }));
  });

  it("shows visitors only visible notes", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "comments", "shown"), {
        threadId: "guestbook",
        status: "visible",
        name: "A",
        body: "B",
        uid: "x",
      });
      await setDoc(doc(db, "comments", "hidden"), {
        threadId: "guestbook",
        status: "hidden",
        name: "A",
        body: "B",
        uid: "x",
      });
    });
    const db = anon();
    await assertSucceeds(
      getDocs(
        query(
          collection(db, "comments"),
          where("threadId", "==", "guestbook"),
          where("status", "==", "visible"),
        ),
      ),
    );
    await assertFails(getDocs(query(collection(db, "comments"), where("threadId", "==", "guestbook"))));
    await assertFails(getDoc(doc(db, "comments", "hidden")));
  });

  it("lets authors delete their own notes but not other people's", async () => {
    await seed((db) =>
      setDoc(doc(db, "comments", "c1"), {
        threadId: "guestbook",
        status: "visible",
        name: "A",
        body: "B",
        uid: "alice",
      }),
    );
    await assertFails(deleteDoc(doc(as("bob"), "comments", "c1")));
    await assertSucceeds(deleteDoc(doc(as("alice"), "comments", "c1")));
  });

  it("lets admins hide, show and delete notes", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "admins", "owner"), {});
      await setDoc(doc(db, "comments", "c1"), {
        threadId: "guestbook",
        status: "visible",
        name: "A",
        body: "B",
        uid: "alice",
      });
    });
    await assertFails(updateDoc(doc(as("alice"), "comments", "c1"), { status: "hidden" }));
    await assertSucceeds(updateDoc(doc(as("owner"), "comments", "c1"), { status: "hidden" }));
    await assertFails(updateDoc(doc(as("owner"), "comments", "c1"), { body: "edited" }));
    await assertSucceeds(getDocs(collection(as("owner"), "comments")));
    await assertSucceeds(deleteDoc(doc(as("owner"), "comments", "c1")));
  });

  it("keeps the admin list private", async () => {
    await seed((db) => setDoc(doc(db, "admins", "owner"), {}));
    await assertSucceeds(getDoc(doc(as("owner"), "admins", "owner")));
    await assertSucceeds(getDoc(doc(as("alice"), "admins", "alice")));
    await assertFails(getDoc(doc(as("alice"), "admins", "owner")));
    await assertFails(setDoc(doc(as("alice"), "admins", "alice"), {}));
  });
});

const image = (size = 1000) => Bytes.fromUint8Array(new Uint8Array(size));

function postWithPhoto(
  db: Firestore,
  uid: string,
  {
    id = "note1",
    size = 1000,
    note = {},
    photo = {},
    savePhoto = true,
  }: {
    id?: string;
    size?: number;
    note?: Record<string, unknown>;
    photo?: Record<string, unknown>;
    savePhoto?: boolean;
  } = {},
) {
  const batch = writeBatch(db);
  batch.set(doc(db, "comments", id), {
    threadId: "recipe:apple-pie",
    name: "Aunt Sue",
    body: "Made it for Sunday dinner!",
    uid,
    createdAt: serverTimestamp(),
    status: "visible",
    photo: { w: 1280, h: 960 },
    ...note,
  });
  if (savePhoto) batch.set(doc(db, "commentPhotos", id), { uid, image: image(size), ...photo });
  batch.set(doc(db, "users", uid), { lastPostAt: serverTimestamp() });
  return batch.commit();
}

const noteWithPhoto = (status: string, uid = "alice") => ({
  threadId: "guestbook",
  status,
  name: "A",
  body: "",
  uid,
  photo: { w: 10, h: 10 },
});

describe("photos with notes", () => {
  it("lets a visitor post a note with a photo, or just a photo", async () => {
    await assertSucceeds(postWithPhoto(as("alice"), "alice"));
    await assertSucceeds(postWithPhoto(as("bob"), "bob", { note: { body: "" }, id: "note2" }));
  });

  it("counts a photo as a post, so the 30-second wait still applies", async () => {
    await assertSucceeds(postWithPhoto(as("alice"), "alice"));
    await assertFails(postWithPhoto(as("alice"), "alice", { id: "note2" }));
  });

  it("rejects a photo without its note, and a note missing the photo it mentions", async () => {
    await assertFails(setDoc(doc(as("alice"), "commentPhotos", "loose"), { uid: "alice", image: image() }));
    await assertFails(postWithPhoto(as("alice"), "alice", { savePhoto: false }));
  });

  it("rejects adding a photo to a note that already exists", async () => {
    await seed((db) => setDoc(doc(db, "comments", "old"), noteWithPhoto("visible")));
    await assertFails(setDoc(doc(as("alice"), "commentPhotos", "old"), { uid: "alice", image: image() }));
  });

  it("rejects a photo saved in someone else's name", async () => {
    await assertFails(postWithPhoto(as("alice"), "alice", { photo: { uid: "bob" } }));
  });

  it("limits photos to 700 KB", async () => {
    await assertSucceeds(postWithPhoto(as("alice"), "alice", { size: 700_000 }));
    await assertFails(postWithPhoto(as("bob"), "bob", { id: "note2", size: 700_001 }));
  });

  it("rejects bad photo details", async () => {
    await assertFails(postWithPhoto(as("a1"), "a1", { id: "n1", note: { photo: { w: 0, h: 10 } } }));
    await assertFails(postWithPhoto(as("a2"), "a2", { id: "n2", note: { photo: { w: 5000, h: 10 } } }));
    await assertFails(postWithPhoto(as("a3"), "a3", { id: "n3", note: { photo: { w: 10 } } }));
    await assertFails(postWithPhoto(as("a4"), "a4", { id: "n4", note: { photo: "big" } }));
    await assertFails(postWithPhoto(as("a5"), "a5", { id: "n5", photo: { image: "not a photo" } }));
    await assertFails(postWithPhoto(as("a6"), "a6", { id: "n6", photo: { caption: "extra" } }));
  });

  it("hides a hidden note's photo from visitors, but not from admins", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "admins", "owner"), {});
      await setDoc(doc(db, "comments", "shown"), noteWithPhoto("visible", "x"));
      await setDoc(doc(db, "commentPhotos", "shown"), { uid: "x", image: image() });
      await setDoc(doc(db, "comments", "hidden"), noteWithPhoto("hidden", "x"));
      await setDoc(doc(db, "commentPhotos", "hidden"), { uid: "x", image: image() });
    });
    await assertSucceeds(getDoc(doc(anon(), "commentPhotos", "shown")));
    await assertFails(getDoc(doc(anon(), "commentPhotos", "hidden")));
    await assertSucceeds(getDoc(doc(as("owner"), "commentPhotos", "hidden")));
    await assertFails(getDocs(collection(anon(), "commentPhotos")));
  });

  it("lets authors and admins delete a photo with its note, and nobody change it", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "admins", "owner"), {});
      for (const id of ["c1", "c2"]) {
        await setDoc(doc(db, "comments", id), noteWithPhoto("visible"));
        await setDoc(doc(db, "commentPhotos", id), { uid: "alice", image: image() });
      }
    });
    const remove = (db: Firestore, id: string) => {
      const batch = writeBatch(db);
      batch.delete(doc(db, "comments", id));
      batch.delete(doc(db, "commentPhotos", id));
      return batch.commit();
    };
    await assertFails(remove(as("bob"), "c1"));
    await assertFails(updateDoc(doc(as("alice"), "commentPhotos", "c1"), { image: image(10) }));
    await assertSucceeds(remove(as("alice"), "c1"));
    await assertSucceeds(remove(as("owner"), "c2"));
  });
});
