import type { CategorySlug, Recipe, RecipeSection, SectionKind, SourceKind } from "../types/recipe";
import { parseFrontmatter } from "./parseFrontmatter";

// Pure helpers shared by the app and the build (vite-plugins/), so nothing
// here may touch `import.meta.env`, the DOM, or browser APIs.

const SECTION_KINDS: Array<[RegExp, SectionKind]> = [
  [/^ingredients\b/i, "ingredients"],
  [/^(instructions|directions|method|basic method)\b/i, "instructions"],
];

function kindOf(heading: string): SectionKind {
  return SECTION_KINDS.find(([pattern]) => pattern.test(heading))?.[1] ?? "other";
}

/** Splits a recipe body at its `## ` headings. `###` stays inside a section. */
export function splitSections(body: string): RecipeSection[] {
  const sections: RecipeSection[] = [];
  let current: RecipeSection | undefined;

  for (const line of body.split(/\r?\n/)) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = { heading: heading[1], kind: kindOf(heading[1]), markdown: "" };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { heading: "", kind: "other", markdown: "" };
      sections.push(current);
    }
    current.markdown += line + "\n";
  }

  return sections
    .map((section) => ({ ...section, markdown: section.markdown.trim() }))
    .filter((section) => section.heading || section.markdown);
}

/** Strips Markdown syntax, leaving readable text on a single line. */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, "")
    .replace(/\|/g, " ")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Bullet and numbered list items in a Markdown block, as plain text. */
export function listItems(markdown: string, kind: "bullet" | "numbered" | "any" = "any"): string[] {
  const pattern =
    kind === "bullet"
      ? /^\s*[-*+]\s+(.*)$/
      : kind === "numbered"
        ? /^\s*\d+\.\s+(.*)$/
        : /^\s*(?:[-*+]|\d+\.)\s+(.*)$/;
  return markdown
    .split(/\r?\n/)
    .map((line) => pattern.exec(line)?.[1])
    .filter((item): item is string => Boolean(item))
    .map(toPlainText);
}

/** Paragraphs that aren't lists, headings or transcriber notes. */
function paragraphs(markdown: string): string[] {
  return markdown
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block && !/^(>|#|[-*+]\s|\d+\.\s|\|)/.test(block))
    .map(toPlainText);
}

const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const num = (value: unknown) => (typeof value === "number" ? value : undefined);
const arr = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);

export function slugFromPath(path: string): string {
  return path.split("/").pop()!.replace(/\.md$/, "");
}

export function buildRecipe(raw: string, fallbackSlug: string): Recipe {
  const { data, body } = parseFrontmatter(raw);
  const slug = str(data.slug) ?? fallbackSlug;
  const sections = splitSections(body);

  const ingredientSections = sections.filter((s) => s.kind === "ingredients");
  const ingredients = ingredientSections.flatMap((s) => {
    const items = listItems(s.markdown, "bullet");
    return items.length ? items : [toPlainText(s.markdown)];
  });

  const steps = sections
    .filter((s) => s.kind === "instructions")
    .flatMap((s) => {
      const numbered = listItems(s.markdown, "numbered");
      return numbered.length ? numbered : paragraphs(s.markdown);
    });

  return {
    title: str(data.title) ?? slug,
    slug,
    category: str(data.category) as CategorySlug,
    tags: arr(data.tags),
    source: (str(data.source) ?? "note") as SourceKind,
    notebookPage: num(data.notebookPage),
    yield: str(data.yield),
    oven: str(data.oven),
    time: str(data.time),
    partial: data.partial === true,
    sourceImages: arr(data.sourceImages),
    notes: str(data.notes),
    body,
    sections,
    ingredients: ingredients.filter(Boolean),
    steps: steps.filter(Boolean),
    text: toPlainText(body),
  };
}
