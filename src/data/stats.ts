import type { CategorySlug } from "../types/recipe";
import { CATEGORIES } from "./categories";
import { notebookRecipes, recipes } from "./recipes";
import { TAG_SLUGS, type TagSlug } from "./taxonomy";

export const categoryCounts: Record<CategorySlug, number> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, recipes.filter((r) => r.category === c.slug).length]),
) as Record<CategorySlug, number>;

export const tagCounts: Record<TagSlug, number> = Object.fromEntries(
  TAG_SLUGS.map((t) => [t, recipes.filter((r) => r.tags.includes(t)).length]),
) as Record<TagSlug, number>;

/** Tags ordered by how many recipes use them. */
export const popularTags: TagSlug[] = [...TAG_SLUGS]
  .filter((t) => tagCounts[t] > 0)
  .sort((a, b) => tagCounts[b] - tagCounts[a]);

export const totals = {
  recipes: recipes.length,
  notebookPages: notebookRecipes.length,
  categories: CATEGORIES.filter((c) => categoryCounts[c.slug] > 0).length,
};
