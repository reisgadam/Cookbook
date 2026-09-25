export type CategorySlug =
  | "appetizers"
  | "soups-salads"
  | "mains"
  | "sides"
  | "breads-breakfast"
  | "cakes"
  | "pies-tarts"
  | "cookies-bars"
  | "desserts"
  | "frostings-sauces"
  | "drinks";

/** What the original recipe was written on. */
export type SourceKind = "notebook" | "card" | "clipping" | "note";

export interface RecipeFrontmatter {
  title: string;
  slug: string;
  category: CategorySlug;
  tags: string[];
  source: SourceKind;
  /** Page number in her spiral notebook (matches her handwritten index). */
  notebookPage?: number;
  /** Servings or yield exactly as the recipe states it, e.g. "Serves 6". */
  yield?: string;
  /** Oven temperature, e.g. "350°F". */
  oven?: string;
  /** Short timing summary, e.g. "Bake 30–35 min". */
  time?: string;
  /** The original is incomplete (torn, cut off, or missing steps). */
  partial: boolean;
  sourceImages: string[];
  /** Notes about the card itself: where it came from, what's legible. */
  notes?: string;
}

export type SectionKind = "ingredients" | "instructions" | "other";

/** A `## Heading` section of a recipe body. */
export interface RecipeSection {
  heading: string;
  kind: SectionKind;
  markdown: string;
}

export interface Recipe extends RecipeFrontmatter {
  body: string;
  sections: RecipeSection[];
  /** Plain-text ingredient lines, used for search. */
  ingredients: string[];
  /** Plain-text instruction steps, used for cook mode. */
  steps: string[];
  /** Plain text of the whole recipe, used for search. */
  text: string;
}
