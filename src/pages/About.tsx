import { ArrowRight, BookOpen } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router";
import aboutFile from "../../content/about.md?raw";
import { Comments } from "../components/community/Comments";
import { GUESTBOOK } from "../community/config";
import { KEEPSAKES, NOTEBOOK_INDEX_PHOTO } from "../data/keepsakes";
import { parseFrontmatter } from "../data/parseFrontmatter";
import { familyPhoto, photoInfo, photoSrcSet, photoUrl } from "../data/photos";
import { notebookRecipes, recipes } from "../data/recipes";
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
              sizes="(max-width: 860px) 70vw, 24rem"
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

      <section className={styles.notebook} aria-labelledby="about-notebook">
        <NotebookPreview />
        <div className={styles.notebookText}>
          <p className="eyebrow">In her own hand</p>
          <h2 id="about-notebook">Her spiral notebook</h2>
          <p>
            {notebookRecipes.length} recipes written out one page at a time, from {notebookRecipes[0]?.title} to{" "}
            {notebookRecipes[notebookRecipes.length - 1]?.title}, with her own index at the front.
          </p>
          <Link to="/notebook" className="btn btn-primary">
            <BookOpen aria-hidden="true" />
            Open her notebook
          </Link>
        </div>
      </section>

      {KEEPSAKES.length > 0 && (
        <section className={styles.keepsakes} aria-labelledby="keepsakes-heading">
          <h2 id="keepsakes-heading">Little notes from her kitchen</h2>
          {KEEPSAKES.map((keepsake) => {
            const info = photoInfo(keepsake.file);
            return (
              <figure key={keepsake.file} className={styles.keepsake}>
                {info && (
                  <img
                    src={photoUrl(keepsake.file, "md")}
                    srcSet={photoSrcSet(keepsake.file)}
                    sizes="(max-width: 760px) 80vw, 20rem"
                    width={info.w}
                    height={info.h}
                    alt={`Her handwritten note about ${keepsake.title}`}
                    loading="lazy"
                    style={{ backgroundColor: info.color }}
                  />
                )}
                <figcaption>
                  <p className={styles.keepsakeCaption}>{keepsake.caption}</p>
                  <blockquote className={`hand ${styles.transcript}`}>
                    {keepsake.lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </blockquote>
                </figcaption>
              </figure>
            );
          })}
        </section>
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

function NotebookPreview() {
  const info = photoInfo(NOTEBOOK_INDEX_PHOTO);
  if (!info) return null;
  return (
    <Link to="/notebook" className={styles.notebookPhoto} tabIndex={-1} aria-hidden="true">
      <img
        src={photoUrl(NOTEBOOK_INDEX_PHOTO, "md")}
        width={info.w}
        height={info.h}
        alt=""
        loading="lazy"
        style={{ backgroundColor: info.color }}
      />
    </Link>
  );
}
