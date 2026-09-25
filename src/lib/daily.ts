import type { Recipe } from "../types/recipe";

// The "recipe of the day" is the same for everyone on a given date, and the
// days walk through every complete recipe before any repeats.

const STEPS = [37, 41, 43, 47, 53, 59, 61];

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : a;
}

function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

function rotation(pool: Recipe[]): Recipe[] {
  return pool.filter((recipe) => !recipe.partial).sort((a, b) => a.slug.localeCompare(b.slug));
}

function pick(list: Recipe[], position: number): Recipe {
  const step = STEPS.find((s) => gcd(s, list.length) === 1) ?? 1;
  return list[(((position * step) % list.length) + list.length) % list.length];
}

export function recipeOfTheDay(pool: Recipe[], date = new Date()): Recipe | undefined {
  const list = rotation(pool);
  return list.length ? pick(list, dayNumber(date)) : undefined;
}

/** A handful of picks that change once a week, working through the collection. */
export function picksOfTheWeek(pool: Recipe[], count: number, date = new Date()): Recipe[] {
  const list = rotation(pool);
  const size = Math.min(count, list.length);
  const week = Math.floor(dayNumber(date) / 7);
  // Consecutive positions in the same stride never repeat within one lap.
  return Array.from({ length: size }, (_, i) => pick(list, 5000 + week * size + i));
}
