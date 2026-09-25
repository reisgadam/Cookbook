import type { Recipe } from "../types/recipe";
import { parseFrontmatter } from "./parseFrontmatter";

// Loaded at build time from the transcribed recipe markdown files.
const rawFiles = import.meta.glob("/content/recipes/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function slugFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "");
}

export const recipes: Recipe[] = Object.entries(rawFiles)
  .map(([path, raw]) => {
    const { data, body } = parseFrontmatter(raw);
    const slug = (data.slug as string) ?? slugFromPath(path);
    return {
      title: (data.title as string) ?? slug,
      slug,
      sourceImages: (data.sourceImages as string[]) ?? [],
      tags: data.tags as string[] | undefined,
      notes: data.notes as string | undefined,
      body,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return recipes.find((r) => r.slug === slug);
}
