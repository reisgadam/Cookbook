import { ArrowLeft, ArrowRight, BookOpen, Clock, Dices, Printer, StickyNote, Thermometer, Users } from "lucide-react";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useParams, useViewTransitionState } from "react-router";
import { CategoryIcon } from "../components/CategoryIcon";
import type { CardPhoto } from "../components/recipe/CardLightbox";
import { OriginalCard } from "../components/recipe/OriginalCard";
import { RecipeBody } from "../components/recipe/RecipeBody";
import { RecipeGrid, RecipeTile } from "../components/RecipeTile";
import { SaveButton } from "../components/SaveButton";
import { ShareButton } from "../components/ShareButton";
import { getCategory } from "../data/categories";
import { getRecipeBySlug, neighbors, recipes, relatedRecipes } from "../data/recipes";
import { SOURCES, TAGS, isTagSlug } from "../data/taxonomy";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useRecentlyViewed } from "../hooks/useRecipeBox";
import { useSurprise, type SurpriseState } from "../hooks/useSurprise";
import { site } from "../site.config";
import type { Recipe, SourceKind } from "../types/recipe";
import { NotFound } from "./NotFound";
import styles from "./RecipeDetail.module.css";

const CardLightbox = lazy(() => import("../components/recipe/CardLightbox"));

const PHOTO_NOUN: Record<SourceKind, string> = {
  notebook: "notebook page",
  card: "recipe card",
  clipping: "clipping",
  note: "handwritten note",
};

export function RecipeDetail() {
  const { slug = "" } = useParams();
  const recipe = getRecipeBySlug(slug);
  if (!recipe) return <NotFound title="We couldn’t find that recipe" />;
  // A fresh component per recipe resets zoom and other page state.
  return <RecipeView key={recipe.slug} recipe={recipe} />;
}

function RecipeView({ recipe }: { recipe: Recipe }) {
  useDocumentTitle(recipe.title);
  const { record } = useRecentlyViewed();
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const arriving = useViewTransitionState(`/recipes/${recipe.slug}`);
  const category = getCategory(recipe.category);

  useEffect(() => {
    record(recipe.slug);
  }, [recipe.slug, record]);

  const photos: CardPhoto[] = recipe.sourceImages.map((file, i, all) => ({
    file,
    alt: `Photo of the original ${PHOTO_NOUN[recipe.source]} for ${recipe.title}${all.length > 1 ? `, ${i + 1} of ${all.length}` : ""}`,
  }));

  return (
    <article className={styles.recipe}>
      <div className="page">
        <nav aria-label="Breadcrumb" className={styles.crumbs} data-print="hide">
          <Link to="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link to="/recipes">Recipes</Link>
          {category && (
            <>
              <span aria-hidden="true">/</span>
              <Link to={`/category/${category.slug}`}>{category.label}</Link>
            </>
          )}
        </nav>

        <SpinAgain recipe={recipe} />

        <header className={styles.header}>
          {category && (
            <p className={`eyebrow ${styles.eyebrow}`}>
              <CategoryIcon category={recipe.category} />
              {category.label}
            </p>
          )}
          <h1 className={styles.title} style={arriving ? { viewTransitionName: "recipe-title" } : undefined}>
            {recipe.title}
          </h1>
          <p className={styles.provenance}>
            {recipe.source === "notebook" ? <BookOpen aria-hidden="true" /> : <StickyNote aria-hidden="true" />}
            {SOURCES[recipe.source].description}
            {recipe.notebookPage ? (
              <>
                , <Link to={`/notebook#page-${recipe.notebookPage}`}>page {recipe.notebookPage}</Link>
              </>
            ) : null}
          </p>

          <Facts recipe={recipe} />

          <div className={styles.actions} data-print="hide">
            <SaveButton slug={recipe.slug} title={recipe.title} variant="button" />
            <ShareButton path={`recipes/${recipe.slug}`} title={recipe.title} text={`${recipe.title}, from ${site.title}`} />
            <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
              <Printer aria-hidden="true" />
              Print
            </button>
          </div>
        </header>

        <div className={styles.layout}>
          <div className={styles.main}>
            {(recipe.notes || recipe.partial) && <AboutCard recipe={recipe} />}
            <RecipeBody recipe={recipe} />
            {recipe.tags.length > 0 && (
              <p className={styles.tags} data-print="hide">
                <span className={styles.tagsLabel}>Filed under</span>
                {recipe.tags.filter(isTagSlug).map((tag) => (
                  <Link key={tag} to={`/recipes?tags=${tag}`} className="chip">
                    {TAGS[tag].label}
                  </Link>
                ))}
              </p>
            )}
          </div>

          <aside className={styles.aside} aria-label="The original recipe">
            <OriginalCard photos={photos} onOpen={setZoomIndex} transitionName={arriving ? "recipe-photo" : undefined} />
          </aside>
        </div>

        <Related recipe={recipe} />
      </div>

      {zoomIndex !== null && (
        <Suspense fallback={null}>
          <CardLightbox photos={photos} index={zoomIndex} downloadName={recipe.slug} onClose={() => setZoomIndex(null)} />
        </Suspense>
      )}
    </article>
  );
}

function Facts({ recipe }: { recipe: Recipe }) {
  const facts = [
    recipe.yield && { icon: <Users aria-hidden="true" />, label: "Makes", value: recipe.yield },
    recipe.oven && { icon: <Thermometer aria-hidden="true" />, label: "Oven", value: recipe.oven },
    recipe.time && { icon: <Clock aria-hidden="true" />, label: "Time", value: recipe.time },
  ].filter(Boolean) as Array<{ icon: ReactNode; label: string; value: string }>;

  if (!facts.length) return null;
  return (
    <dl className={styles.facts}>
      {facts.map((fact) => (
        <div key={fact.label} className={styles.fact}>
          {fact.icon}
          <dt className="visually-hidden">{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function AboutCard({ recipe }: { recipe: Recipe }) {
  return (
    <aside className={styles.about} aria-label="About the original">
      <p className={`hand ${styles.aboutLabel}`}>About the original</p>
      {recipe.notes && <p>{recipe.notes}</p>}
      {recipe.partial && (
        <p className={styles.partial}>
          <span className="badge badge-partial">Partial recipe</span> Part of this recipe is missing from the original.
          If you remember how {site.name} made it, please add a note on this page.
        </p>
      )}
    </aside>
  );
}

/** Shown after "Surprise me", so the next roll is one tap away. */
function SpinAgain({ recipe }: { recipe: Recipe }) {
  const location = useLocation();
  const surprise = useSurprise();
  const state = location.state as SurpriseState | null;
  if (!state?.surprise) return null;
  const pool = state.pool ? recipes.filter((r) => state.pool!.includes(r.slug)) : recipes;

  return (
    <div className={styles.spin} data-print="hide">
      <Dices aria-hidden="true" />
      <span>A random pick{state.pool ? " from your list" : ""}. Not quite right?</span>
      <button type="button" className="btn btn-small btn-primary" onClick={() => surprise(pool, recipe.slug)}>
        Spin again
      </button>
    </div>
  );
}

function Related({ recipe }: { recipe: Recipe }) {
  const related = relatedRecipes(recipe, 4);
  const { previous, next } = neighbors(recipe);
  const category = getCategory(recipe.category);

  return (
    <div data-print="hide">
      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="related-heading">
          <h2 id="related-heading">More like this</h2>
          <RecipeGrid>
            {related.map((other) => (
              <li key={other.slug}>
                <RecipeTile recipe={other} />
              </li>
            ))}
          </RecipeGrid>
        </section>
      )}

      {(previous || next) && (
        <nav className={styles.pager} aria-label={`More ${category?.label ?? "recipes"}`}>
          {previous ? (
            <Link to={`/recipes/${previous.slug}`} className={styles.pagerLink} rel="prev" viewTransition>
              <ArrowLeft aria-hidden="true" />
              <span>
                <span className={styles.pagerLabel}>Previous in {category?.label}</span>
                <span className={styles.pagerTitle}>{previous.title}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={`/recipes/${next.slug}`} className={`${styles.pagerLink} ${styles.pagerNext}`} rel="next" viewTransition>
              <span>
                <span className={styles.pagerLabel}>Next in {category?.label}</span>
                <span className={styles.pagerTitle}>{next.title}</span>
              </span>
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
