import { ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router";
import aboutFile from "../../content/about.md?raw";
import { Comments } from "../components/community/Comments";
import { GUESTBOOK } from "../community/config";
import { parseFrontmatter } from "../data/parseFrontmatter";
import { LEAD_PHOTO_SIZES } from "../data/photoPaths";
import { familyPhoto } from "../data/photos";
import { recipes } from "../data/recipes";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { site } from "../site.config";
import styles from "./About.module.css";

const about = parseFrontmatter(aboutFile);
const text = (key: string, fallback: string) =>
  typeof about.data[key] === "string" && about.data[key] ? (about.data[key] as string) : fallback;

export function About() {
  const title = text("title", `About ${site.name}`);
  useDocumentTitle(title);
  const photo = familyPhoto(site.heroPhoto);
  const showStory = about.data.draft !== true && about.body.replace(/<!--[\s\S]*?-->/g, "").trim().length > 0;
  const bySource = (source: string) => recipes.filter((r) => r.source === source).length;

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.hero}>
        {photo && (
          <figure className={styles.photo}>
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              sizes={LEAD_PHOTO_SIZES.aboutPortrait}
              width={photo.info.w}
              height={photo.info.h}
              alt={site.heroPhotoAlt}
              style={{ backgroundColor: photo.info.color }}
            />
            {site.heroPhotoCaption && <figcaption className="hand">{site.heroPhotoCaption}</figcaption>}
          </figure>
        )}
        <div className={styles.heroText}>
          <p className={`hand ${styles.kicker}`}>{text("kicker", "In loving memory")}</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.dedication}>
            {text(
              "dedication",
              `This cookbook keeps ${site.name}'s recipes together so the whole family can keep cooking them.`,
            )}
          </p>
          <ul className={styles.facts}>
            <li>
              <strong>{recipes.length}</strong> recipes
            </li>
            <li>
              <strong>{bySource("notebook")}</strong> in her spiral notebook
            </li>
            <li>
              <strong>{bySource("card") + bySource("note")}</strong> handwritten cards and notes
            </li>
            <li>
              <strong>{bySource("clipping")}</strong> clippings she saved
            </li>
          </ul>
        </div>
      </header>

      {showStory && (
        <article className={styles.story}>
          <ReactMarkdown>{about.body}</ReactMarkdown>
        </article>
      )}

      <Comments
        threadId={GUESTBOOK}
        heading={`Memories of ${site.name}`}
        intro={`Share a memory of her: a meal at her table, a story, something she used to say. Everyone who visits can read it.`}
        placeholder="Share a memory…"
      />

      <p className={styles.browse}>
        <Link to="/recipes" className="btn btn-secondary">
          Browse all {recipes.length} recipes <ArrowRight aria-hidden="true" />
        </Link>
      </p>
    </div>
  );
}
