import { LayoutGrid, List, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { CategoryIcon } from "../components/CategoryIcon";
import { Highlight } from "../components/Highlight";
import { RecipeGrid, RecipeTile } from "../components/RecipeTile";
import { SurpriseButton } from "../components/SurpriseButton";
import { CATEGORIES, getCategory } from "../data/categories";
import { getRecipeBySlug, recipes } from "../data/recipes";
import { isTagSlug, SOURCES, TAGS, TAG_SLUGS, type TagSlug } from "../data/taxonomy";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { FIELD_LABELS, getSearchIndex, searchRecipes, type RecipeHit } from "../lib/search";
import type { Recipe, SourceKind } from "../types/recipe";
import { NotFound } from "./NotFound";
import styles from "./Recipes.module.css";

type Sort = "relevance" | "az" | "za";
interface Row {
  recipe: Recipe;
  hit?: RecipeHit;
}

const SEARCH_DELAY = 200;
const TAGS_SHOWN = 10;

export function Recipes() {
  const { category: categorySlug } = useParams();
  const category = categorySlug ? getCategory(categorySlug) : undefined;
  if (categorySlug && !category) return <NotFound />;
  return <Explorer categorySlug={category?.slug} />;
}

function Explorer({ categorySlug }: { categorySlug?: string }) {
  const [params, setParams] = useSearchParams();
  const category = categorySlug ? getCategory(categorySlug) : undefined;
  const q = params.get("q") ?? "";
  const tagsParam = params.get("tags") ?? "";
  const tags = useMemo(() => tagsParam.split(",").filter(isTagSlug), [tagsParam]);
  const source = (params.get("from") ?? "") as SourceKind | "";
  const view = params.get("view") === "index" ? "index" : "cards";

  // The box updates results instantly; the URL catches up a moment later.
  const [input, setInput] = useState(q);
  const [synced, setSynced] = useState(q);
  if (q !== synced) {
    setSynced(q);
    setInput(q);
  }
  useEffect(() => {
    const value = input.trim();
    if (value === q) return;
    const timer = window.setTimeout(() => {
      setSynced(value);
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (value) next.set("q", value);
          else next.delete("q");
          next.delete("sort");
          return next;
        },
        { replace: true, preventScrollReset: true },
      );
    }, SEARCH_DELAY);
    return () => window.clearTimeout(timer);
  }, [input, q, setParams]);

  const query = input.trim();
  const searching = query.length > 0;
  const sortParam = params.get("sort") as Sort | null;
  const sort: Sort = sortParam ?? (searching ? "relevance" : "az");

  const hits = useMemo(() => (searching ? searchRecipes(getSearchIndex(recipes), query) : null), [query, searching]);

  // Everything except the category filter, so the tabs can show counts.
  const base = useMemo<Row[]>(() => {
    const rows: Row[] = hits
      ? hits.flatMap((hit) => {
          const recipe = getRecipeBySlug(hit.slug);
          return recipe ? [{ recipe, hit }] : [];
        })
      : recipes.map((recipe) => ({ recipe }));
    return rows.filter(
      ({ recipe }) => tags.every((tag) => recipe.tags.includes(tag)) && (!source || recipe.source === source),
    );
  }, [hits, tags, source]);

  const rows = useMemo(() => {
    const filtered = category ? base.filter(({ recipe }) => recipe.category === category.slug) : base;
    if (sort === "az") return [...filtered].sort((a, b) => collate(a.recipe.title, b.recipe.title));
    if (sort === "za") return [...filtered].sort((a, b) => collate(b.recipe.title, a.recipe.title));
    return filtered;
  }, [base, category, sort]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { recipe } of base) counts.set(recipe.category, (counts.get(recipe.category) ?? 0) + 1);
    return counts;
  }, [base]);

  const tagCounts = useMemo(() => {
    const counts = new Map<TagSlug, number>();
    for (const { recipe } of rows) for (const tag of recipe.tags) if (isTagSlug(tag)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return counts;
  }, [rows]);

  const title = category ? category.label : "All Recipes";
  useDocumentTitle(searching ? `“${query}” in ${title}` : title);

  const updateParam = (key: string, value: string | null) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );

  const toggleTag = (tag: TagSlug) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    updateParam("tags", next.join(",") || null);
  };

  const clearAll = () => {
    setInput("");
    setSynced("");
    setParams(view === "index" ? { view } : {}, { replace: true, preventScrollReset: true });
  };

  // Keep the query, tags and view when switching category.
  const carry = new URLSearchParams(params);
  if (query) carry.set("q", query);
  else carry.delete("q");
  carry.delete("sort");
  const carried = carry.toString() ? `?${carry}` : "";

  const [showAllTags, setShowAllTags] = useState(false);
  const availableTags = TAG_SLUGS.filter((tag) => tags.includes(tag) || (tagCounts.get(tag) ?? 0) > 0).sort(
    (a, b) => Number(tags.includes(b)) - Number(tags.includes(a)) || (tagCounts.get(b) ?? 0) - (tagCounts.get(a) ?? 0),
  );
  const visibleTags = showAllTags ? availableTags : availableTags.slice(0, Math.max(TAGS_SHOWN, tags.length));
  const hiddenTagCount = availableTags.length - visibleTags.length;
  const filtersActive = Boolean(query || tags.length || source);
  const recipesShown = rows.map((row) => row.recipe);

  return (
    <div className={`page ${styles.page}`}>
      <nav aria-label="Breadcrumb" className={styles.crumbs}>
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        {category ? <Link to={`/recipes${carried}`}>Recipes</Link> : <span aria-current="page">Recipes</span>}
        {category && (
          <>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{category.label}</span>
          </>
        )}
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>
          {category && <CategoryIcon category={category.slug} className={styles.titleIcon} />}
          {title}
        </h1>
        <p className={styles.lede}>
          {category ? category.blurb : "Every recipe from her notebook, recipe cards and clippings."}
        </p>
      </header>

      <div className={styles.searchRow} role="search">
        <label htmlFor="recipe-search" className="visually-hidden">
          Search recipes or ingredients
        </label>
        <Search aria-hidden="true" className={styles.searchIcon} />
        <input
          id="recipe-search"
          type="search"
          className={styles.searchInput}
          placeholder={`Search ${category ? category.label.toLowerCase() : "recipes"} or ingredients…`}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
        {input && (
          <button type="button" className={`icon-btn ${styles.clear}`} onClick={() => setInput("")} aria-label="Clear search">
            <X aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Categories" className={styles.tabs}>
        <Link to={`/recipes${carried}`} className="chip" aria-current={!category ? "page" : undefined}>
          All <span className={styles.tabCount}>{base.length}</span>
        </Link>
        {CATEGORIES.map((c) => {
          const count = categoryCounts.get(c.slug) ?? 0;
          const current = category?.slug === c.slug;
          if (!count && !current) return null;
          return (
            <Link
              key={c.slug}
              to={`/category/${c.slug}${carried}`}
              className="chip"
              aria-current={current ? "page" : undefined}
            >
              <CategoryIcon category={c.slug} />
              {c.label} <span className={styles.tabCount}>{count}</span>
            </Link>
          );
        })}
      </nav>

      {visibleTags.length > 0 && (
        <div className={styles.tagRow} role="group" aria-label="Filter by tag">
          {visibleTags.map((tag) => {
            const info = TAGS[tag];
            return (
              <button
                key={tag}
                type="button"
                className={`chip ${styles.tag}`}
                aria-pressed={tags.includes(tag)}
                onClick={() => toggleTag(tag)}
                title={"hint" in info ? info.hint : undefined}
              >
                {info.label}
                <span className={styles.tabCount}>{tagCounts.get(tag) ?? 0}</span>
              </button>
            );
          })}
          {(hiddenTagCount > 0 || showAllTags) && (
            <button type="button" className={styles.moreTags} onClick={() => setShowAllTags((all) => !all)} aria-expanded={showAllTags}>
              {showAllTags ? "Fewer tags" : `+${hiddenTagCount} more`}
            </button>
          )}
        </div>
      )}

      <div className={styles.toolbar}>
        <p className={styles.count} aria-live="polite" aria-atomic="true">
          {rows.length === 1 ? "1 recipe" : `${rows.length} recipes`}
          {searching && ` matching “${query}”`}
        </p>

        <div className={styles.controls}>
          <label className={styles.control}>
            <span className="visually-hidden">Written on</span>
            <select className={styles.select} value={source} onChange={(event) => updateParam("from", event.target.value || null)}>
              <option value="">From anywhere</option>
              {(Object.keys(SOURCES) as SourceKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {SOURCE_FILTER_LABELS[kind]}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.control}>
            <span className="visually-hidden">Sort</span>
            <select
              className={styles.select}
              value={sort}
              onChange={(event) => updateParam("sort", event.target.value === (searching ? "relevance" : "az") ? null : event.target.value)}
            >
              {searching && <option value="relevance">Best match</option>}
              <option value="az">A to Z</option>
              <option value="za">Z to A</option>
            </select>
          </label>

          <div className={styles.viewToggle} role="group" aria-label="View">
            <button
              type="button"
              aria-pressed={view === "cards"}
              onClick={() => updateParam("view", null)}
              title="Cards"
            >
              <LayoutGrid aria-hidden="true" />
              <span className="visually-hidden">Cards</span>
            </button>
            <button
              type="button"
              aria-pressed={view === "index"}
              onClick={() => updateParam("view", "index")}
              title="Index"
            >
              <List aria-hidden="true" />
              <span className="visually-hidden">Index</span>
            </button>
          </div>

          <SurpriseButton
            pool={recipesShown}
            variant="secondary"
            label={filtersActive || category ? "Surprise me from these" : "Surprise me"}
            className="btn-small"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>
          <h2>No recipes found</h2>
          <p>
            {searching ? `Nothing matches “${query}”` : "Nothing matches those filters"}
            {category ? ` in ${category.label}` : ""}. Try a single ingredient, like “lemon” or “chicken”.
          </p>
          <div className={styles.emptyActions}>
            <button type="button" className="btn btn-primary" onClick={clearAll}>
              Clear search and filters
            </button>
            {category && (
              <Link to={`/recipes${carried}`} className="btn btn-secondary">
                Search all categories
              </Link>
            )}
          </div>
        </div>
      ) : view === "index" ? (
        <RecipeIndex rows={rows} query={query} showCategory={!category} />
      ) : (
        <RecipeGrid label="Recipes">
          {rows.map(({ recipe, hit }) => (
            <li key={recipe.slug}>
              <RecipeTile recipe={recipe} query={query} hint={matchHint(hit)} />
            </li>
          ))}
        </RecipeGrid>
      )}

      {filtersActive && rows.length > 0 && (
        <p className={styles.reset}>
          <button type="button" className="btn btn-ghost" onClick={clearAll}>
            <X aria-hidden="true" /> Clear search and filters
          </button>
        </p>
      )}
    </div>
  );
}

const SOURCE_FILTER_LABELS: Record<SourceKind, string> = {
  notebook: "Her spiral notebook",
  card: "Recipe cards",
  clipping: "Clippings",
  note: "Handwritten notes",
};

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const collate = (a: string, b: string) => collator.compare(a, b);

function matchHint(hit?: RecipeHit): string | undefined {
  const field = hit?.fields[0];
  return field && field !== "title" ? `Found in ${FIELD_LABELS[field]}` : undefined;
}

/** The "cookbook index" view: an A–Z list with letter headings. */
function RecipeIndex({ rows, query, showCategory }: { rows: Row[]; query: string; showCategory: boolean }) {
  const groups = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of [...rows].sort((a, b) => collate(a.recipe.title, b.recipe.title))) {
      const first = row.recipe.title[0]?.toUpperCase() ?? "#";
      const letter = /[A-Z]/.test(first) ? first : "#";
      map.set(letter, [...(map.get(letter) ?? []), row]);
    }
    return [...map.entries()];
  }, [rows]);

  return (
    <div className={styles.index}>
      <nav aria-label="Jump to letter" className={styles.letters}>
        {groups.map(([letter]) => (
          <a key={letter} href={`#letter-${letter}`}>
            {letter}
          </a>
        ))}
      </nav>
      <div className={styles.indexColumns}>
        {groups.map(([letter, group]) => (
          <section key={letter} aria-labelledby={`letter-${letter}`} className={styles.indexGroup}>
            <h2 id={`letter-${letter}`} className={styles.letter}>
              {letter}
            </h2>
            <ul>
              {group.map(({ recipe }) => (
                <li key={recipe.slug}>
                  <Link to={`/recipes/${recipe.slug}`} viewTransition>
                    <Highlight text={recipe.title} query={query} />
                  </Link>
                  {showCategory && <span className={styles.indexMeta}>{getCategory(recipe.category)?.label}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
