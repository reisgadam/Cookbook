import { Eye, EyeOff, LogIn, LogOut, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { timeAgo } from "../components/community/Comments";
import { useToast } from "../components/Toast";
import { communityEnabled, GUESTBOOK } from "../community/config";
import type { Comment } from "../community/firebase";
import { getRecipeBySlug } from "../data/recipes";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import styles from "./Admin.module.css";

type Api = typeof import("../community/firebase");
type Filter = "all" | "visible" | "hidden";
interface Viewer {
  uid: string;
  email: string | null;
  anonymous: boolean;
}

/** Owner-only moderation for notes and memories. Not linked from the site. */
export function Admin() {
  useDocumentTitle("Moderation");
  return (
    <div className={`page ${styles.page}`}>
      <p className="eyebrow">Site owner</p>
      <h1 className={styles.title}>Moderation</h1>
      {communityEnabled ? (
        <Moderation />
      ) : (
        <p className={styles.lede}>
          Notes and hearts aren’t switched on yet. Follow <code>docs/COMMUNITY_SETUP.md</code> in the
          repository to connect Firebase, and this page will let you manage what people post.
        </p>
      )}
    </div>
  );
}

function Moderation() {
  const [api, setApi] = useState<Api>();
  const [viewer, setViewer] = useState<Viewer | null | undefined>(undefined);
  const [admin, setAdmin] = useState<boolean>();
  const toast = useToast();

  useEffect(() => {
    let stop: (() => void) | undefined;
    import("../community/firebase").then((module) => {
      setApi(module);
      stop = module.watchUser(async (user) => {
        setViewer(user ? { uid: user.uid, email: user.email, anonymous: user.isAnonymous } : null);
        setAdmin(user && !user.isAnonymous ? await module.isAdmin(user.uid) : false);
      });
    });
    return () => stop?.();
  }, []);

  if (!api || viewer === undefined) return <p className={styles.lede}>Loading…</p>;

  const signIn = async () => {
    try {
      await api.signInWithGoogle();
    } catch {
      toast("Sign-in was cancelled or blocked. Allow pop-ups for this site and try again.");
    }
  };

  if (!viewer || viewer.anonymous) {
    return (
      <div className={styles.card}>
        <p>Only the site owner can moderate notes. Sign in with the Google account you set up as an admin.</p>
        <button type="button" className="btn btn-primary" onClick={signIn}>
          <LogIn aria-hidden="true" />
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className={styles.card}>
        <p>
          You’re signed in as <strong>{viewer.email}</strong>, but this account isn’t an admin yet. In the
          Firebase console, open <strong>Firestore Database</strong>, start a collection called{" "}
          <code>admins</code>, and add a document whose ID is:
        </p>
        <p className={styles.uid}>
          <code>{viewer.uid}</code>
          <button
            type="button"
            className="btn btn-small btn-secondary"
            onClick={() => navigator.clipboard.writeText(viewer.uid).then(() => toast("Copied"))}
          >
            Copy
          </button>
        </p>
        <p>Then reload this page.</p>
        <button type="button" className="btn btn-ghost" onClick={() => api.signOutUser()}>
          <LogOut aria-hidden="true" />
          Sign out
        </button>
      </div>
    );
  }

  return <CommentQueue api={api} email={viewer.email} />;
}

function threadLabel(threadId: string): { label: string; to: string } {
  if (threadId === GUESTBOOK) return { label: "Guestbook", to: "/about#notes" };
  const slug = threadId.replace(/^recipe:/, "");
  return { label: getRecipeBySlug(slug)?.title ?? slug, to: `/recipes/${slug}#notes` };
}

function CommentQueue({ api, email }: { api: Api; email: string | null }) {
  const [comments, setComments] = useState<Comment[]>();
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const toast = useToast();

  useEffect(
    () =>
      api.watchAllComments(
        (list) => setComments(list),
        () => setFailed(true),
      ),
    [api],
  );

  const shown = useMemo(
    () => (comments ?? []).filter((c) => filter === "all" || c.status === filter),
    [comments, filter],
  );

  const act = async (work: Promise<void>, done: string) => {
    try {
      await work;
      toast(done);
    } catch {
      toast("That didn’t work. Please try again.");
    }
  };

  const hiddenCount = comments?.filter((c) => c.status === "hidden").length ?? 0;

  return (
    <>
      <div className={styles.bar}>
        <p className={styles.lede}>
          Signed in as <strong>{email}</strong>. Hidden notes stay saved but aren’t shown on the site.
        </p>
        <button type="button" className="btn btn-ghost btn-small" onClick={() => api.signOutUser()}>
          <LogOut aria-hidden="true" />
          Sign out
        </button>
      </div>

      <div className={styles.filters} role="group" aria-label="Show">
        {(["all", "visible", "hidden"] as Filter[]).map((value) => (
          <button
            key={value}
            type="button"
            className="chip"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {value === "all"
              ? `All (${comments?.length ?? 0})`
              : value === "visible"
                ? "Shown"
                : `Hidden (${hiddenCount})`}
          </button>
        ))}
      </div>

      {failed && (
        <p role="alert">Couldn’t load notes. Check that your account is in the admins collection.</p>
      )}
      {comments && shown.length === 0 && <p className={styles.lede}>Nothing here.</p>}

      <ul className={styles.list}>
        {shown.map((comment) => {
          const thread = threadLabel(comment.threadId);
          const hidden = comment.status === "hidden";
          return (
            <li key={comment.id} className={`${styles.item} ${hidden ? styles.hidden : ""}`}>
              <p className={styles.meta}>
                <strong>{comment.name}</strong> on <Link to={thread.to}>{thread.label}</Link> ·{" "}
                {timeAgo(comment.createdAt)}
                {hidden && <span className="badge badge-partial">Hidden</span>}
              </p>
              <p className={styles.body}>{comment.body}</p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className="btn btn-small btn-secondary"
                  onClick={() =>
                    act(
                      api.setCommentStatus(comment.id, hidden ? "visible" : "hidden"),
                      hidden ? "Note shown" : "Note hidden",
                    )
                  }
                >
                  {hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                  {hidden ? "Show" : "Hide"}
                </button>
                <button
                  type="button"
                  className="btn btn-small btn-ghost"
                  onClick={() => {
                    if (window.confirm(`Delete this note from ${comment.name}? This can't be undone.`)) {
                      void act(api.deleteComment(comment.id), "Note deleted");
                    }
                  }}
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
