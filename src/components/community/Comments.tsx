import { MessageCircleHeart, Trash2 } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { LIMITS } from "../../community/config";
import type { Comment } from "../../community/firebase";
import { CooldownError, useThread } from "../../community/store";
import { useStoredState } from "../../hooks/useStoredState";
import { useToast } from "../Toast";
import styles from "./Comments.module.css";

interface Props {
  threadId: string;
  heading?: string;
  intro: string;
  placeholder?: string;
}

/** "Notes & memories": a comment thread anyone can add to with just a name. */
export function Comments({ threadId, heading = "Notes & memories", intro, placeholder }: Props) {
  const { status, comments, post, remove, uid } = useThread(threadId);
  const headingId = useId();
  if (status === "off") return null;

  return (
    <section id="notes" className={styles.section} aria-labelledby={headingId} data-print="hide">
      <h2 id={headingId} className={styles.heading}>
        <MessageCircleHeart aria-hidden="true" />
        {heading}
        {comments.length > 0 && <span className={styles.total}>{comments.length}</span>}
      </h2>
      <p className={styles.intro}>{intro}</p>

      <CommentForm onPost={post} placeholder={placeholder} disabled={status === "error"} />

      {status === "loading" && <p className={styles.status}>Loading notes…</p>}
      {status === "error" && (
        <p className={styles.status} role="alert">
          Notes can’t load right now. Please try again a little later.
        </p>
      )}
      {status === "ready" && comments.length === 0 && (
        <p className={styles.status}>No notes yet. Yours could be the first.</p>
      )}

      {comments.length > 0 && (
        <ol className={styles.list}>
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} mine={comment.uid === uid} onDelete={() => remove(comment.id)} />
          ))}
        </ol>
      )}
    </section>
  );
}

function CommentForm({
  onPost,
  placeholder = "Share a memory, a tip, or how your batch turned out…",
  disabled,
}: {
  onPost: (name: string, body: string) => Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [name, setName] = useStoredState("commenter-name", "");
  const [body, setBody] = useState("");
  const [trap, setTrap] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const id = useId();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("Please add your name, so everyone knows who wrote it.");
    if (!body.trim()) return setError("Please write a note first.");
    // Bots fill in every field, including the hidden one; people never see it.
    if (trap) {
      setBody("");
      return;
    }
    setSending(true);
    try {
      await onPost(name, body);
      setBody("");
      toast("Thank you! Your note is posted.");
    } catch (caught) {
      setError(
        caught instanceof CooldownError
          ? `Please wait ${caught.seconds} more seconds before posting again.`
          : "Sorry, your note didn’t post. Please wait a moment and try again.",
      );
    } finally {
      setSending(false);
    }
  };

  const remaining = LIMITS.body - body.length;

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.field}>
        <label htmlFor={`${id}-name`}>Your name</label>
        <input
          id={`${id}-name`}
          className="field"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={LIMITS.name}
          autoComplete="name"
          placeholder="e.g. Aunt Linda"
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-body`}>Your note</label>
        <textarea
          id={`${id}-body`}
          className={`field ${styles.textarea}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={LIMITS.body}
          rows={4}
          placeholder={placeholder}
          required
          aria-describedby={`${id}-help`}
        />
      </div>
      <div className={styles.trap} aria-hidden="true">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.target.value)} />
      </div>
      <div className={styles.formFooter}>
        <p id={`${id}-help`} className={styles.help}>
          Your name and note will be visible to anyone with the link.
          {remaining < 200 && <span className={styles.remaining}> {remaining} characters left.</span>}
        </p>
        <button type="submit" className="btn btn-primary" disabled={sending || disabled}>
          {sending ? "Posting…" : "Post note"}
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

const AVATAR_COLORS = ["#b5502f", "#5e7d63", "#8a5a9e", "#2f6f8f", "#a06a1f", "#9c4a6b", "#4f6d3a"];

function avatarColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "?"
  );
}

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const fullDate = new Intl.DateTimeFormat("en", { dateStyle: "long", timeStyle: "short" });

export function timeAgo(date: Date | null, now = Date.now()): string {
  if (!date) return "just now";
  const seconds = Math.round((date.getTime() - now) / 1000);
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

function CommentItem({ comment, mine, onDelete }: { comment: Comment; mine: boolean; onDelete: () => Promise<void> }) {
  const toast = useToast();
  const remove = async () => {
    if (!window.confirm("Delete your note? This can't be undone.")) return;
    try {
      await onDelete();
      toast("Your note was deleted.");
    } catch {
      toast("Sorry, that didn’t work. Please try again.");
    }
  };

  return (
    <li className={styles.comment}>
      <span className={styles.avatar} style={{ backgroundColor: avatarColor(comment.name) }} aria-hidden="true">
        {initials(comment.name)}
      </span>
      <div className={styles.commentBody}>
        <p className={styles.meta}>
          <strong>{comment.name}</strong>
          <time dateTime={comment.createdAt?.toISOString()} title={comment.createdAt ? fullDate.format(comment.createdAt) : undefined}>
            {timeAgo(comment.createdAt)}
          </time>
        </p>
        <p className={styles.text}>{comment.body}</p>
        {mine && (
          <button type="button" className={styles.delete} onClick={remove}>
            <Trash2 aria-hidden="true" />
            Delete my note
          </button>
        )}
      </div>
    </li>
  );
}
