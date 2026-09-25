import { BookOpen, Images } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router";
import type { CardPhoto } from "../components/recipe/CardLightbox";
import { NOTEBOOK_INDEX_PHOTO } from "../data/keepsakes";
import { LEAD_PHOTO_SIZES } from "../data/photoPaths";
import { photoInfo, photoSrcSet, photoUrl } from "../data/photos";
import { notebookRecipes } from "../data/recipes";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { site } from "../site.config";
import styles from "./Notebook.module.css";

const CardLightbox = lazy(() => import("../components/recipe/CardLightbox"));

export function Notebook() {
  useDocumentTitle(`${site.name}'s Notebook`);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  // Every page in order: the index, then each recipe's photos.
  const { pages, firstPageOf } = useMemo(() => {
    const pages: CardPhoto[] = [
      { file: NOTEBOOK_INDEX_PHOTO, alt: `The handwritten index of ${site.name}'s notebook` },
    ];
    const firstPageOf = new Map<string, number>();
    for (const recipe of notebookRecipes) {
      firstPageOf.set(recipe.slug, pages.length);
      recipe.sourceImages.forEach((file, i, all) =>
        pages.push({
          file,
          alt: `Notebook page ${recipe.notebookPage}: ${recipe.title}${all.length > 1 ? ` (${i + 1} of ${all.length})` : ""}`,
        }),
      );
    }
    return { pages, firstPageOf };
  }, []);

  const info = photoInfo(NOTEBOOK_INDEX_PHOTO);

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.header}>
        <p className="eyebrow">In her own hand</p>
        <h1>{site.name}’s Notebook</h1>
        <p className={styles.lede}>
          {notebookRecipes.length} recipes in a spiral notebook, each written out on its own page, with her
          handwritten index at the front. Open any page to read it in her handwriting.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => setZoomIndex(0)}>
          <BookOpen aria-hidden="true" />
          Flip through the notebook
        </button>
      </header>

      <div className={styles.layout}>
        {info && (
          <figure className={styles.indexPhoto}>
            <button type="button" onClick={() => setZoomIndex(0)} className={styles.photoButton}>
              <img
                src={photoUrl(NOTEBOOK_INDEX_PHOTO, "md")}
                srcSet={photoSrcSet(NOTEBOOK_INDEX_PHOTO)}
                sizes={LEAD_PHOTO_SIZES.notebookIndex}
                width={info.w}
                height={info.h}
                alt={`The handwritten index page of ${site.name}'s notebook. Select to zoom in.`}
                style={{ backgroundColor: info.color }}
              />
            </button>
            <figcaption className="hand">Her index, at the front of the notebook</figcaption>
          </figure>
        )}

        <section aria-labelledby="contents-heading" className={styles.contents}>
          <h2 id="contents-heading">Contents</h2>
          <ol className={styles.list}>
            {notebookRecipes.map((recipe) => (
              <li key={recipe.slug} id={`page-${recipe.notebookPage}`} className={styles.entry}>
                <span className={styles.number}>{recipe.notebookPage}</span>
                <Link to={`/recipes/${recipe.slug}`} className={styles.title} viewTransition>
                  {recipe.title}
                </Link>
                <span className={styles.leader} aria-hidden="true" />
                <button
                  type="button"
                  className={styles.view}
                  onClick={() => setZoomIndex(firstPageOf.get(recipe.slug) ?? 0)}
                  aria-label={`See page ${recipe.notebookPage}, ${recipe.title}, in her handwriting`}
                  title="See the page"
                >
                  <Images aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {zoomIndex !== null && (
        <Suspense fallback={null}>
          <CardLightbox
            photos={pages}
            index={zoomIndex}
            downloadName="notebook-page"
            onClose={() => setZoomIndex(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
