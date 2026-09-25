// Runs against the Firestore emulator: npm run test:rules
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
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
  batch.set(doc(db, "counters", "reactions"), { [key]: increment(on ? by : -by), last: key }, { merge: true });
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
      setDoc(doc(db, "counters", "reactions"), { "love:apple-pie": increment(1), last: "love:apple-pie" }, { merge: true }),
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
    batch.set(doc(db, "counters", "reactions"), { "love:apple-pie": increment(-1), last: "love:apple-pie" }, { merge: true });
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
    await seed((db) => setDoc(doc(db, "users", "alice"), { lastPostAt: Timestamp.fromMillis(Date.now() - 60_000) }));
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
      await setDoc(doc(db, "comments", "shown"), { threadId: "guestbook", status: "visible", name: "A", body: "B", uid: "x" });
      await setDoc(doc(db, "comments", "hidden"), { threadId: "guestbook", status: "hidden", name: "A", body: "B", uid: "x" });
    });
    const db = anon();
    await assertSucceeds(getDocs(query(collection(db, "comments"), where("threadId", "==", "guestbook"), where("status", "==", "visible"))));
    await assertFails(getDocs(query(collection(db, "comments"), where("threadId", "==", "guestbook"))));
    await assertFails(getDoc(doc(db, "comments", "hidden")));
  });

  it("lets authors delete their own notes but not other people's", async () => {
    await seed((db) => setDoc(doc(db, "comments", "c1"), { threadId: "guestbook", status: "visible", name: "A", body: "B", uid: "alice" }));
    await assertFails(deleteDoc(doc(as("bob"), "comments", "c1")));
    await assertSucceeds(deleteDoc(doc(as("alice"), "comments", "c1")));
  });

  it("lets admins hide, show and delete notes", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "admins", "owner"), {});
      await setDoc(doc(db, "comments", "c1"), { threadId: "guestbook", status: "visible", name: "A", body: "B", uid: "alice" });
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
