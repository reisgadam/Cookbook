import MiniSearch from "minisearch";
import { getCategory } from "../data/categories";
import { tagLabel } from "../data/taxonomy";
import type { Recipe } from "../types/recipe";

// Instant search over every recipe, run entirely in the browser.

const STOP_WORDS = new Set(["a", "an", "and", "the", "of", "with", "in", "on", "to", "for", "or", "my", "mom", "moms"]);

/** Lowercase and strip accents, so "Buñuelos" matches "bunuelos". */
export function foldCase(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Index/query term: folded, stop words dropped, simple plurals trimmed. */
export function normalizeTerm(term: string): string | null {
  const folded = foldCase(term).replace(/['’]/g, "");
  if (!folded || STOP_WORDS.has(folded)) return null;
  if (folded.length > 3 && folded.endsWith("s") && !folded.endsWith("ss")) return folded.slice(0, -1);
  return folded;
}

interface SearchDoc {
  id: string;
  title: string;
  ingredients: string;
  tags: string;
  category: string;
  notes: string;
  text: string;
}

export type MatchField = keyof Omit<SearchDoc, "id">;

export interface RecipeHit {
  slug: string;
  score: number;
  /** Which parts of the recipe matched, best first. */
  fields: MatchField[];
}

const FIELD_ORDER: MatchField[] = ["title", "ingredients", "tags", "category", "notes", "text"];

export function createSearchIndex(recipes: Recipe[]): MiniSearch<SearchDoc> {
  const index = new MiniSearch<SearchDoc>({
    fields: FIELD_ORDER,
    processTerm: normalizeTerm,
    searchOptions: {
      boost: { title: 4, ingredients: 2, tags: 2, category: 1.5, notes: 1, text: 1 },
      prefix: (term) => term.length >= 2,
      fuzzy: (term) => (term.length >= 5 ? 0.2 : false),
      processTerm: normalizeTerm,
    },
  });
  index.addAll(
    recipes.map((recipe) => ({
      id: recipe.slug,
      title: recipe.title,
      ingredients: recipe.ingredients.join("\n"),
      tags: recipe.tags.map(tagLabel).join(" "),
      category: getCategory(recipe.category)?.label ?? "",
      notes: [recipe.notes, recipe.yield, recipe.time].filter(Boolean).join(" "),
      text: recipe.text,
    })),
  );
  return index;
}

/** Matches every word first; if nothing matches them all, any word will do. */
export function searchRecipes(index: MiniSearch<SearchDoc>, query: string): RecipeHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  let results = index.search(trimmed, { combineWith: "AND" });
  if (!results.length) results = index.search(trimmed, { combineWith: "OR" });
  return results.map((result) => {
    const matched = new Set(Object.values(result.match).flat() as MatchField[]);
    return {
      slug: String(result.id),
      score: result.score,
      fields: FIELD_ORDER.filter((field) => matched.has(field)),
    };
  });
}

let sharedIndex: MiniSearch<SearchDoc> | undefined;
let sharedFor: Recipe[] | undefined;

/** One index for the whole app, built on first use (a few milliseconds). */
export function getSearchIndex(recipes: Recipe[]): MiniSearch<SearchDoc> {
  if (!sharedIndex || sharedFor !== recipes) {
    sharedIndex = createSearchIndex(recipes);
    sharedFor = recipes;
  }
  return sharedIndex;
}

export const FIELD_LABELS: Record<MatchField, string> = {
  title: "the title",
  ingredients: "the ingredients",
  tags: "its tags",
  category: "its category",
  notes: "the card notes",
  text: "the instructions",
};

/** Splits text into highlighted and plain runs for the words in `query`. */
export function highlightParts(text: string, query: string): Array<{ text: string; hit: boolean }> {
  const terms = query
    .split(/[^\p{L}\p{N}]+/u)
    .map((word) => normalizeTerm(word))
    .filter((term): term is string => Boolean(term));
  if (!terms.length) return [{ text, hit: false }];

  const parts: Array<{ text: string; hit: boolean }> = [];
  for (const chunk of text.split(/([\p{L}\p{N}]+)/u)) {
    if (!chunk) continue;
    const word = foldCase(chunk);
    const hit = /[\p{L}\p{N}]/u.test(chunk) && terms.some((term) => word.startsWith(term));
    const last = parts[parts.length - 1];
    if (last && last.hit === hit) last.text += chunk;
    else parts.push({ text: chunk, hit });
  }
  return parts;
}
