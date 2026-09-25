import { ArrowRight, BookOpen, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { CategoryIcon } from "../components/CategoryIcon";
import { RecipeGrid, RecipeTile } from "../components/RecipeTile";
import { SurpriseButton } from "../components/SurpriseButton";
import { useCommunity } from "../community/store";
import { CATEGORIES, getCategory } from "../data/categories";
import { NOTEBOOK_INDEX_PHOTO } from "../data/keepsakes";
import { LEAD_PHOTO_SIZES, NOTEBOOK_TEASER_SIZES } from "../data/photoPaths";
import { familyPhoto, photoInfo, photoSrcSet, photoUrl } from "../data/photos";
import { byTitle, getRecipeBySlug, notebookRecipes, recipes } from "../data/recipes";
import { categoryCounts, popularTags, totals } from "../data/stats";
import { sourceLabel, TAGS } from "../data/taxonomy";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useRecentlyViewed } from "../hooks/useRecipeBox";
import { picksOfTheWeek, recipeOfTheDay } from "../lib/daily";
import { site } from "../site.config";
import type { Recipe } from "../types/recipe";
import styles from "./Home.module.css";

export function Home() {
  useDocumentTitle();
  const today = recipeOfTheDay(recipes);
  const picks = picksOfTheWeek(
    recipes.filter((r) => r.slug !== today?.slug),
    8,
  );
  const { counts } = useCommunity();
  const loves = (slug: string) => counts[`love:${slug}`] ?? 0;
  const favorites = recipes
    .filter((r) => loves(r.slug) > 0)
    .sort((a, b) => loves(b.slug) - loves(a.slug) || byTitle(a, b))
    .slice(0, 8);
  const { recent } = useRecentlyViewed();
  const recentRecipes = recent
    .map(getRecipeBySlug)
    .filter((r): r is Recipe => Boolean(r))
    .slice(0, 4);

  return (
    <>
      <Hero />
      {today && <TodayCard recipe={today} />}

      <section className={`page ${styles.section}`} aria-labelledby="categories-heading">
        <div className={styles.sectionHead}>
          <h2 id="categories-heading">Browse by category</h2>
          <Link to="/recipes" className={styles.more}>
            All {totals.recipes} recipes <ArrowRight aria-hidden="true" />
          </Link>
        </div>
        <ul className={styles.categories}>
          {CATEGORIES.map((category) => (
            <li key={category.slug}>
              <Link to={`/category/${category.slug}`} className={styles.category}>
                <span className={styles.categoryIcon}>
                  <CategoryIcon category={category.slug} />
                </span>
                <span className={styles.categoryText}>
                  <span className={styles.categoryName}>{category.label}</span>
                  <span className={styles.categoryBlurb}>{category.blurb}</span>
                </span>
                <span
                  className={styles.categoryCount}
                  aria-label={`${categoryCounts[category.slug]} recipes`}
                >
                  {categoryCounts[category.slug]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {favorites.length >= 3 && (
        <section className={`page ${styles.section}`} aria-labelledby="favorites-heading">
          <div className={styles.sectionHead}>
            <div>
              <h2 id="favorites-heading">Family favorites</h2>
              <p className={styles.sectionNote}>The recipes with the most hearts.</p>
            </div>
            <Link to="/recipes?sort=loved" className={styles.more}>
              See them all <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <RecipeGrid>
            {favorites.map((recipe) => (
              <li key={recipe.slug}>
                <RecipeTile recipe={recipe} loves={loves(recipe.slug)} />
              </li>
            ))}
          </RecipeGrid>
        </section>
      )}

      {recentRecipes.length > 0 && (
        <section className={`page ${styles.section}`} aria-labelledby="recent-heading">
          <div className={styles.sectionHead}>
            <h2 id="recent-heading">Pick up where you left off</h2>
          </div>
          <RecipeGrid>
            {recentRecipes.map((recipe) => (
              <li key={recipe.slug}>
                <RecipeTile recipe={recipe} />
              </li>
            ))}
          </RecipeGrid>
        </section>
      )}

      <section className={`page ${styles.section}`} aria-labelledby="picks-heading">
        <div className={styles.sectionHead}>
          <div>
            <h2 id="picks-heading">This week’s picks</h2>
            <p className={styles.sectionNote}>A fresh handful from the collection every week.</p>
          </div>
          <SurpriseButton variant="ghost" label="Surprise me" />
        </div>
        <RecipeGrid>
          {picks.map((recipe) => (
            <li key={recipe.slug}>
              <RecipeTile recipe={recipe} />
            </li>
          ))}
        </RecipeGrid>
      </section>

      <NotebookTeaser />

      <section className={`page ${styles.section}`} aria-labelledby="tags-heading">
        <h2 id="tags-heading" className={styles.smallHeading}>
          Looking for something in particular?
        </h2>
        <ul className={styles.tags}>
          {popularTags.slice(0, 14).map((tag) => (
            <li key={tag}>
              <Link to={`/recipes?tags=${tag}`} className="chip">
                {TAGS[tag].label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Hero() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const photo = familyPhoto(site.heroPhoto);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/recipes?q=${encodeURIComponent(q)}` : "/recipes");
  };

  return (
    <section className={styles.hero}>
      <div className={`page ${styles.heroInner}`}>
        <div className={styles.heroText}>
          <p className={`hand ${styles.kicker}`}>A family cookbook</p>
          <h1 className={styles.heroTitle}>{site.title}</h1>
          <p className={styles.tagline}>{site.tagline}</p>

          <form role="search" className={styles.search} onSubmit={onSubmit}>
            <label htmlFor="home-search" className="visually-hidden">
              Search recipes or ingredients
            </label>
            <Search aria-hidden="true" className={styles.searchIcon} />
            <input
              id="home-search"
              type="search"
              className={styles.searchInput}
              placeholder="A recipe or ingredient…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              enterKeyHint="search"
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>

          <div className={styles.heroActions}>
            <Link to="/recipes" className="btn btn-secondary">
              Browse all {totals.recipes} recipes
            </Link>
            <SurpriseButton variant="ghost" />
          </div>

          <p className={styles.stats}>
            <span>{totals.recipes} recipes</span>
            <span aria-hidden="true">·</span>
            <span>{totals.notebookPages} notebook pages</span>
            <span aria-hidden="true">·</span>
            <span>{totals.categories} categories</span>
          </p>
        </div>

        {photo && (
          <figure className={styles.polaroid}>
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              sizes={LEAD_PHOTO_SIZES.homePortrait}
              width={photo.info.w}
              height={photo.info.h}
              alt={site.heroPhotoAlt}
              {...{ fetchpriority: "high" }}
              style={{ backgroundColor: photo.info.color }}
            />
            {site.heroPhotoCaption && <figcaption className="hand">{site.heroPhotoCaption}</figcaption>}
          </figure>
        )}
      </div>
    </section>
  );
}

function TodayCard({ recipe }: { recipe: Recipe }) {
  const photo = recipe.sourceImages[0];
  const info = photoInfo(photo);
  const facts = [getCategory(recipe.category)?.label, recipe.time, recipe.yield].filter(Boolean);

  return (
    <section className={`page ${styles.section}`} aria-labelledby="today-heading">
      <article className={styles.today}>
        {info && (
          <Link to={`/recipes/${recipe.slug}`} className={styles.todayPhoto} tabIndex={-1} aria-hidden="true">
            <img
              src={photoUrl(photo, "md")}
              srcSet={photoSrcSet(photo)}
              sizes="(max-width: 760px) 90vw, 28rem"
              width={info.w}
              height={info.h}
              alt=""
              loading="lazy"
              style={{ backgroundColor: info.color }}
            />
          </Link>
        )}
        <div className={styles.todayText}>
          <p id="today-heading" className={`hand ${styles.todayKicker}`}>
            Today from {site.name}’s kitchen
          </p>
          <h2 className={styles.todayTitle}>
            <Link to={`/recipes/${recipe.slug}`} viewTransition>
              {recipe.title}
            </Link>
          </h2>
          <p className={styles.todayFacts}>{facts.join(" · ")}</p>
          <p className={styles.todaySource}>{sourceLabel(recipe.source, recipe.notebookPage)}</p>
          <div className={styles.todayActions}>
            <Link to={`/recipes/${recipe.slug}`} className="btn btn-primary" viewTransition>
              Open the recipe <ArrowRight aria-hidden="true" />
            </Link>
            <SurpriseButton variant="secondary" label="Show me another" exclude={recipe.slug} />
          </div>
        </div>
      </article>
    </section>
  );
}

function NotebookTeaser() {
  const first = notebookRecipes[0];
  const last = notebookRecipes[notebookRecipes.length - 1];
  const index = NOTEBOOK_INDEX_PHOTO;
  const info = photoInfo(index);
  if (!first || !last) return null;

  return (
    <section className={`page ${styles.section}`} aria-labelledby="notebook-heading">
      <div className={styles.notebook}>
        {info && (
          <div className={styles.notebookPhoto}>
            <img
              src={photoUrl(index, "md")}
              srcSet={photoSrcSet(index)}
              sizes={NOTEBOOK_TEASER_SIZES}
              width={info.w}
              height={info.h}
              alt={`The handwritten index page of ${site.name}'s spiral recipe notebook, listing ${notebookRecipes.length} recipes`}
              loading="lazy"
              style={{ backgroundColor: info.color }}
            />
          </div>
        )}
        <div className={styles.notebookText}>
          <p className="eyebrow">In her own hand</p>
          <h2 id="notebook-heading">{site.name}’s spiral notebook</h2>
          <p>
            {notebookRecipes.length} recipes, written out in the order she kept them. It starts with{" "}
            {first.title} on page 1 and ends with {last.title} on page {last.notebookPage}, and her
            handwritten index is still at the front.
          </p>
          <Link to="/notebook" className="btn btn-primary">
            <BookOpen aria-hidden="true" />
            Open her notebook
          </Link>
        </div>
      </div>
    </section>
  );
}
