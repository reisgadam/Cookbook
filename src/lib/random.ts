import type { Recipe } from "../types/recipe";

// "Surprise me": a random recipe that doesn't repeat the last few picks.
// The history lives in memory, so it resets when the page is reloaded.
let history: string[] = [];

export function pickRandom(
  pool: Recipe[],
  { exclude, random = Math.random }: { exclude?: string; random?: () => number } = {},
): Recipe | undefined {
  if (!pool.length) return undefined;
  const memory = Math.min(10, Math.floor(pool.length / 2));
  const recent = history.slice(0, memory);

  let candidates = pool.filter((recipe) => recipe.slug !== exclude && !recent.includes(recipe.slug));
  if (!candidates.length) candidates = pool.filter((recipe) => recipe.slug !== exclude);
  if (!candidates.length) candidates = pool;

  const choice = candidates[Math.floor(random() * candidates.length)];
  history = [choice.slug, ...history.filter((slug) => slug !== choice.slug)].slice(0, 10);
  return choice;
}

export function resetRandomHistory(): void {
  history = [];
}
