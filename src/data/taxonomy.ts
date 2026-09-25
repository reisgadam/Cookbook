import type { SourceKind } from "../types/recipe";

export interface TagInfo {
  label: string;
  /** Shown as a tooltip where the label alone isn't obvious. */
  hint?: string;
}

/** The fixed tag vocabulary. Recipes may only use these (checked by tests). */
export const TAGS = {
  chocolate: { label: "Chocolate" },
  fruit: { label: "Fruit" },
  apple: { label: "Apples" },
  lemon: { label: "Lemon" },
  chicken: { label: "Chicken" },
  beef: { label: "Beef" },
  pork: { label: "Pork & Ham" },
  turkey: { label: "Turkey" },
  veal: { label: "Veal" },
  seafood: { label: "Seafood" },
  pasta: { label: "Pasta" },
  potatoes: { label: "Potatoes" },
  casserole: { label: "Casseroles" },
  italian: { label: "Italian" },
  mexican: { label: "Mexican & Spanish" },
  holiday: { label: "Holiday" },
  party: { label: "Party Food" },
  quick: { label: "Quick & Easy" },
  "make-ahead": { label: "Make-Ahead" },
  "no-bake": { label: "No-Bake" },
  frozen: { label: "Frozen" },
  "kid-friendly": { label: "Kid-Friendly" },
  spirited: { label: "Spirited", hint: "Contains alcohol" },
  canning: { label: "Canning" },
} satisfies Record<string, TagInfo>;

export type TagSlug = keyof typeof TAGS;

export const TAG_SLUGS = Object.keys(TAGS) as TagSlug[];

export function isTagSlug(slug: string): slug is TagSlug {
  return slug in TAGS;
}

export function tagLabel(slug: string): string {
  return isTagSlug(slug) ? TAGS[slug].label : slug;
}

export interface SourceInfo {
  label: string;
  /** Completes the sentence "…", e.g. on the recipe page's provenance line. */
  description: string;
}

export const SOURCES: Record<SourceKind, SourceInfo> = {
  notebook: { label: "Spiral notebook", description: "From her spiral recipe notebook" },
  card: { label: "Recipe card", description: "Written on a recipe card" },
  clipping: { label: "Clipping", description: "A printed recipe she clipped and kept" },
  note: { label: "Handwritten note", description: "Jotted on a loose page or scrap of paper" },
};

/** e.g. "Spiral notebook, page 24" or "Recipe card". */
export function sourceLabel(source: SourceKind, notebookPage?: number): string {
  const label = SOURCES[source]?.label ?? "Handwritten note";
  return source === "notebook" && notebookPage ? `${label}, page ${notebookPage}` : label;
}
