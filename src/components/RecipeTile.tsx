import { Heart } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useViewTransitionState } from "react-router";
import { getCategory } from "../data/categories";
import { photoInfo, photoUrl } from "../data/photos";
import { sourceLabel } from "../data/taxonomy";
import type { Recipe } from "../types/recipe";
import { CategoryIcon } from "./CategoryIcon";
import { Highlight } from "./Highlight";
import styles from "./RecipeTile.module.css";
import { SaveButton } from "./SaveButton";

interface Props {
  recipe: Recipe;
  /** Search words to highlight in the title. */
  query?: string;
  /** Replaces the timing line, e.g. "Found in the ingredients". */
  hint?: string;
  /** Number of hearts, when the community features are on. */
  loves?: number;
  headingLevel?: 2 | 3;
}

/** A recipe as an index card, with a snapshot of the original peeking out. */
export function RecipeTile({ recipe, query, hint, loves, headingLevel = 3 }: Props) {
  const Heading = `h${headingLevel}` as const;
  const to = `/recipes/${recipe.slug}`;
  const transitioning = useViewTransitionState(to);
  const photo = recipe.sourceImages[0];
  const info = photoInfo(photo);
  const landscape = info ? info.w > info.h : false;
  const facts = hint ?? [recipe.time, recipe.yield].filter(Boolean).join(" · ");

  return (
    <article className={styles.tile}>
      <p className={styles.eyebrow}>
        <CategoryIcon category={recipe.category} className={styles.icon} />
        {getCategory(recipe.category)?.label}
      </p>

      <Heading
        className={styles.title}
        style={transitioning ? { viewTransitionName: "recipe-title" } : undefined}
      >
        <Link to={to} className={styles.link} viewTransition>
          <Highlight text={recipe.title} query={query} />
        </Link>
      </Heading>

      {facts && <p className={styles.facts}>{facts}</p>}

      <div className={styles.bottom}>
        <p className={styles.source}>{sourceLabel(recipe.source, recipe.notebookPage)}</p>
        {recipe.partial && <span className="badge badge-partial">Partial</span>}
        {loves ? (
          <span className={styles.loves} aria-label={`${loves} ${loves === 1 ? "heart" : "hearts"}`}>
            <Heart aria-hidden="true" />
            {loves}
          </span>
        ) : null}
        <SaveButton slug={recipe.slug} title={recipe.title} className={styles.save} />
      </div>

      {info && (
        <div
          className={`${styles.snapshot} ${landscape ? styles.landscape : ""}`}
          style={transitioning ? { viewTransitionName: "recipe-photo" } : undefined}
          aria-hidden="true"
        >
          <img
            src={photoUrl(photo, "sm")}
            alt=""
            width={info.widths.sm}
            height={Math.round((info.widths.sm * info.h) / info.w)}
            loading="lazy"
            decoding="async"
            style={{ backgroundColor: info.color }}
          />
        </div>
      )}
    </article>
  );
}

export function RecipeGrid({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul className={styles.grid} aria-label={label}>
      {children}
    </ul>
  );
}
