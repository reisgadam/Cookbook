import type { CategorySlug, Recipe } from "../types/recipe";
import { buildRecipe, slugFromPath } from "./recipeModel";

// Loaded at build time from the transcribed recipe markdown files.
const rawFiles = import.meta.glob("/content/recipes/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
export const byTitle = (a: Recipe, b: Recipe) => collator.compare(a.title, b.title);

export const recipes: Recipe[] = Object.entries(rawFiles)
  .map(([path, raw]) => buildRecipe(raw, slugFromPath(path)))
  .sort(byTitle);

const bySlug = new Map(recipes.map((recipe) => [recipe.slug, recipe]));

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return bySlug.get(slug);
}

export function recipesInCategory(category: CategorySlug): Recipe[] {
  return recipes.filter((recipe) => recipe.category === category);
}

/** Her spiral notebook, in page order (matches her handwritten index). */
export const notebookRecipes: Recipe[] = recipes
  .filter((recipe) => recipe.source === "notebook" && recipe.notebookPage)
  .sort((a, b) => a.notebookPage! - b.notebookPage!);

/** Previous and next recipe alphabetically within the same category. */
export function neighbors(recipe: Recipe): { previous?: Recipe; next?: Recipe } {
  const siblings = recipesInCategory(recipe.category);
  const index = siblings.findIndex((r) => r.slug === recipe.slug);
  return { previous: siblings[index - 1], next: siblings[index + 1] };
}

/** Recipes most like this one: same category first, then shared tags. */
export function relatedRecipes(recipe: Recipe, limit = 4): Recipe[] {
  const tags = new Set(recipe.tags);
  return recipes
    .filter((other) => other.slug !== recipe.slug)
    .map((other) => ({
      other,
      score:
        (other.category === recipe.category ? 3 : 0) +
        other.tags.filter((tag) => tags.has(tag)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || byTitle(a.other, b.other))
    .slice(0, limit)
    .map(({ other }) => other);
}
