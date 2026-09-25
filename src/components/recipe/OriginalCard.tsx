import { ZoomIn } from "lucide-react";
import { photoInfo, photoSrcSet, photoUrl } from "../../data/photos";
import type { CardPhoto } from "./CardLightbox";
import styles from "./OriginalCard.module.css";

interface Props {
  photos: CardPhoto[];
  onOpen: (index: number) => void;
  /** view-transition-name for the first photo while this page is animating in. */
  transitionName?: string;
}

/** The photographed original, as a keepsake next to the transcription. */
export function OriginalCard({ photos, onOpen, transitionName }: Props) {
  if (!photos.length) return null;
  const many = photos.length > 1;

  return (
    <figure className={styles.original}>
      <figcaption className={styles.caption}>
        <span className="hand">The original</span>
        <span className={styles.count}>{many ? `${photos.length} photos` : "1 photo"}</span>
      </figcaption>

      <ul className={`${styles.photos} ${many ? styles.many : ""}`}>
        {photos.map((photo, i) => {
          const info = photoInfo(photo.file);
          return (
            <li key={photo.file}>
              <button
                type="button"
                className={styles.photo}
                onClick={() => onOpen(i)}
                style={i === 0 && transitionName ? { viewTransitionName: transitionName } : undefined}
              >
                <img
                  src={photoUrl(photo.file, "md")}
                  srcSet={photoSrcSet(photo.file)}
                  sizes="(max-width: 1023px) 80vw, 30rem"
                  width={info?.w}
                  height={info?.h}
                  alt={photo.alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  style={{ backgroundColor: info?.color }}
                />
                <span className={styles.zoom} aria-hidden="true">
                  <ZoomIn />
                </span>
                <span className="visually-hidden">Zoom in</span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className={styles.hint} data-print="hide">
        <ZoomIn aria-hidden="true" />
        Tap a photo to zoom in on the writing.
      </p>
    </figure>
  );
}
