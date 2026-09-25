// Everything that talks to Firebase. This module is loaded on demand (see
// store.ts), so the Firebase SDK never slows down the first page view.
import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import {
  connectAuthEmulator,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  Bytes,
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  getDoc,
  getFirestore,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentSnapshot,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";
import { appCheckSiteKey, firebaseConfig, useEmulators, type ReactionKind } from "./config";
import type { PreparedPhoto } from "./photo";

export interface Comment {
  id: string;
  threadId: string;
  name: string;
  body: string;
  uid: string;
  /** null until the server has stamped a just-posted note. */
  createdAt: Date | null;
  status: "visible" | "hidden";
  /** The shape of the note's photo, if it has one (the photo itself is in commentPhotos). */
  photo?: { w: number; h: number };
}

let app: FirebaseApp | undefined;
let db: Firestore;
let auth: Auth;

function init() {
  if (app) return;
  app = initializeApp(firebaseConfig);
  if (appCheckSiteKey && !useEmulators) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  db = getFirestore(app);
  auth = getAuth(app);
  if (useEmulators) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
}

/** The current visitor, signing them in anonymously the first time. */
export function ensureUser(): Promise<User> {
  init();
  return new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          stop();
          resolve(user);
        } else {
          signInAnonymously(auth).catch((error) => {
            stop();
            reject(error);
          });
        }
      },
      reject,
    );
  });
}

export function watchUser(callback: (user: User | null) => void): Unsubscribe {
  init();
  return onAuthStateChanged(auth, callback);
}

// ---------- Hearts and "I made this" ----------

export function watchCounts(
  callback: (counts: Record<string, number>) => void,
  onError: () => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, "counters", "reactions"),
    (snapshot) => {
      const counts: Record<string, number> = {};
      for (const [key, value] of Object.entries(snapshot.data() ?? {})) {
        if (key !== "last" && typeof value === "number") counts[key] = value;
      }
      callback(counts);
    },
    onError,
  );
}

export function watchMyReactions(
  uid: string,
  callback: (keys: string[]) => void,
  onError: () => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, "reactions"), where("uid", "==", uid)),
    (snapshot) => callback(snapshot.docs.map((d) => `${d.get("kind")}:${d.get("slug")}`)),
    onError,
  );
}

/** Adds or removes one reaction, together with its +1/-1 on the shared counter. */
export async function setReaction(uid: string, kind: ReactionKind, slug: string, on: boolean): Promise<void> {
  const key = `${kind}:${slug}`;
  const batch = writeBatch(db);
  const reaction = doc(db, "reactions", `${key}:${uid}`);
  if (on) batch.set(reaction, { kind, slug, uid, createdAt: serverTimestamp() });
  else batch.delete(reaction);
  batch.set(doc(db, "counters", "reactions"), { [key]: increment(on ? 1 : -1), last: key }, { merge: true });
  await batch.commit();
}

// ---------- Notes & memories ----------

function toComment(snapshot: DocumentSnapshot): Comment {
  const data = snapshot.data({ serverTimestamps: "estimate" }) ?? {};
  return {
    id: snapshot.id,
    threadId: data.threadId,
    name: data.name,
    body: data.body,
    uid: data.uid,
    createdAt: data.createdAt?.toDate?.() ?? null,
    status: data.status,
    photo: data.photo ? { w: data.photo.w, h: data.photo.h } : undefined,
  };
}

export function watchThread(
  threadId: string,
  callback: (comments: Comment[]) => void,
  onError: () => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, "comments"),
      where("threadId", "==", threadId),
      where("status", "==", "visible"),
      orderBy("createdAt", "desc"),
      limit(300),
    ),
    (snapshot) => callback(snapshot.docs.map(toComment)),
    onError,
  );
}

/** An id for a new note, picked before it's saved so its photo can be shown right away. */
export function newCommentId(): string {
  return doc(collection(db, "comments")).id;
}

export async function postComment(
  uid: string,
  id: string,
  note: { threadId: string; name: string; body: string },
  photo?: PreparedPhoto,
): Promise<void> {
  const image = photo && Bytes.fromUint8Array(new Uint8Array(await photo.blob.arrayBuffer()));
  const batch = writeBatch(db);
  batch.set(doc(db, "comments", id), {
    threadId: note.threadId,
    name: note.name,
    body: note.body,
    uid,
    createdAt: serverTimestamp(),
    status: "visible",
    ...(photo && { photo: { w: photo.width, h: photo.height } }),
  });
  // The photo is kept under the note's id, and saved together with it.
  if (image) batch.set(doc(db, "commentPhotos", id), { uid, image });
  // Stamps the time so the security rules can enforce the posting cooldown.
  batch.set(doc(db, "users", uid), { lastPostAt: serverTimestamp() });
  await batch.commit();
}

/** The photo shared with a note, as a JPEG. */
export async function getCommentPhoto(id: string): Promise<Blob> {
  const image: unknown = (await getDoc(doc(db, "commentPhotos", id))).get("image");
  if (!(image instanceof Bytes)) throw new Error(`No photo for note ${id}`);
  return new Blob([new Uint8Array(image.toUint8Array())], { type: "image/jpeg" });
}

export function deleteComment(id: string, hasPhoto = false): Promise<void> {
  if (!hasPhoto) return deleteDoc(doc(db, "comments", id));
  const batch = writeBatch(db);
  batch.delete(doc(db, "comments", id));
  batch.delete(doc(db, "commentPhotos", id));
  return batch.commit();
}

// ---------- Moderation (site owner) ----------

export async function isAdmin(uid: string): Promise<boolean> {
  try {
    return (await getDoc(doc(db, "admins", uid))).exists();
  } catch {
    return false;
  }
}

export function signInWithGoogle(): Promise<unknown> {
  init();
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOutUser(): Promise<void> {
  init();
  return signOut(auth);
}

export function watchAllComments(callback: (comments: Comment[]) => void, onError: () => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, "comments"), orderBy("createdAt", "desc"), limit(300)),
    (snapshot) => callback(snapshot.docs.map(toComment)),
    onError,
  );
}

export function setCommentStatus(id: string, status: "visible" | "hidden"): Promise<void> {
  return updateDoc(doc(db, "comments", id), { status });
}
