import type { RecipeFrontmatter } from "../types/recipe";

/**
 * Minimal YAML-subset frontmatter parser: supports `key: value`, quoted
 * strings, and simple `key: [a, b, c]` arrays. Avoids pulling in a full
 * YAML/gray-matter dependency for a handful of predictable fields.
 */
export function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, body: raw };

  const [, frontmatter, body] = match;
  const data: Record<string, unknown> = {};

  for (const line of frontmatter.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (value.startsWith("[") && value.endsWith("]")) {
      data[key] = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, "");
      data[key] = value;
    }
  }

  return { data, body: body.trim() };
}

export function toFrontmatter(
  data: Record<string, unknown>,
): Partial<RecipeFrontmatter> {
  return data as Partial<RecipeFrontmatter>;
}
