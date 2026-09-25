import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { loadCommentPhoto } from "../../community/store";
import styles from "./Comments.module.css";

const PhotoViewer = lazy(() => import("./PhotoViewer"));

interface Props {
  /** The note's id, which is also its photo's. */
  id: string;
  photo: { w: number; h: number };
  name: string;
}

/**
 * A photo shared with a note. Its space is kept from the start so the notes
 * don't jump, and it's only downloaded once it's about to scroll into view.
 */
export function NotePhoto({ id, photo, name }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    let cancelled = false;
    const load = () =>
      loadCommentPhoto(id).then(
        (url) => !cancelled && setSrc(url),
        () => !cancelled && setFailed(true),
      );
    if (!("IntersectionObserver" in window)) {
      void load();
      return () => {
        cancelled = true;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void load();
      },
      { rootMargin: "400px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [id, attempt]);

  const alt = `Shared by ${name}`;

  return (
    <>
      <div
        ref={frame}
        className={`${styles.photo} ${photo.w >= photo.h ? styles.photoWide : styles.photoTall}`}
        style={{ aspectRatio: `${photo.w} / ${photo.h}` }}
      >
        {src ? (
          <button
            type="button"
            className={styles.photoButton}
            onClick={() => setOpen(true)}
            aria-label={`Enlarge the photo from ${name}`}
          >
            <img src={src} alt={alt} width={photo.w} height={photo.h} />
          </button>
        ) : (
          failed && (
            <button
              type="button"
              className={styles.photoMissing}
              onClick={() => {
                setFailed(false);
                setAttempt((count) => count + 1);
              }}
            >
              The photo didn’t load. <span>Try again</span>
            </button>
          )
        )}
      </div>
      {open && src && (
        <Suspense fallback={null}>
          <PhotoViewer src={src} width={photo.w} height={photo.h} alt={alt} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
