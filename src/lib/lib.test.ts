import { describe, expect, it } from "vitest";
import { recipes } from "../data/recipes";
import { picksOfTheWeek } from "./daily";
import { pickRandom, resetRandomHistory } from "./random";
import { createSearchIndex, highlightParts, normalizeTerm, searchRecipes } from "./search";

const index = createSearchIndex(recipes);
const top = (query: string, n = 3) =>
  searchRecipes(index, query)
    .slice(0, n)
    .map((hit) => hit.slug);

describe("search", () => {
  it("ranks title matches first", () => {
    expect(top("banana", 3).sort()).toEqual([
      "banana-bread",
      "banana-nut-muffins",
      "frozen-banana-daiquiris",
    ]);
  });

  it("matches word prefixes as you type", () => {
    expect(top("choc", 30)).toContain("chocolate-mousse");
  });

  it("forgives small typos", () => {
    expect(top("brocoli", 10)).toContain("cream-of-broccoli-soup");
  });

  it("ignores accents and plurals", () => {
    expect(top("bunuelo", 1)).toEqual(["rolled-bunuelos"]);
    expect(top("potato", 10)).toContain("home-style-potatoes");
  });

  it("finds recipes by ingredient and says where it matched", () => {
    const hit = searchRecipes(index, "buttermilk").find((h) => h.slug === "moms-chicken-pie");
    expect(hit?.fields[0]).toBe("ingredients");
  });

  it("needs every word to match when some recipe has them all", () => {
    const slugs = top("chocolate cake", 20);
    expect(slugs).toContain("chocolate-chip-cake");
    expect(slugs).not.toContain("banana-bread");
  });

  it("falls back to any word when no recipe has them all", () => {
    expect(top("pickles zzzzzz", 5)).toContain("kosher-style-dill-pickles");
  });

  it("returns nothing for an empty query", () => {
    expect(searchRecipes(index, "   ")).toEqual([]);
  });

  it("normalizes terms", () => {
    expect(normalizeTerm("Buñuelos")).toBe("bunuelo");
    expect(normalizeTerm("the")).toBeNull();
    expect(normalizeTerm("glass")).toBe("glass");
  });

  it("highlights matching words", () => {
    expect(highlightParts("Chocolate Chip Cake", "choc cake")).toEqual([
      { text: "Chocolate", hit: true },
      { text: " Chip ", hit: false },
      { text: "Cake", hit: true },
    ]);
  });
});

describe("pickRandom", () => {
  it("never returns the excluded recipe or repeats recent picks", () => {
    resetRandomHistory();
    const pool = recipes.slice(0, 6);
    const seen = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const pick = pickRandom(pool, { exclude: pool[0].slug })!;
      expect(pick.slug).not.toBe(pool[0].slug);
      expect(seen.has(pick.slug)).toBe(false);
      seen.add(pick.slug);
    }
  });

  it("handles tiny pools", () => {
    resetRandomHistory();
    expect(pickRandom([])).toBeUndefined();
    expect(pickRandom([recipes[0]], { exclude: recipes[0].slug })).toBe(recipes[0]);
  });
});

describe("this week's picks", () => {
  it("stay the same all day and change the next week", () => {
    const day = new Date(2026, 8, 25);
    const picks = picksOfTheWeek(recipes, 8, day);
    expect(picksOfTheWeek(recipes, 8, new Date(2026, 8, 25, 21))).toEqual(picks);
    expect(picksOfTheWeek(recipes, 8, new Date(2026, 9, 2))).not.toEqual(picks);
  });

  it("never include an incomplete recipe", () => {
    for (let week = 0; week < 20; week++) {
      for (const recipe of picksOfTheWeek(recipes, 8, new Date(2026, 0, 1 + week * 7))) {
        expect(recipe.partial, recipe.slug).toBe(false);
      }
    }
  });

  it("gives distinct weekly picks", () => {
    const picks = picksOfTheWeek(recipes, 8, new Date(2026, 8, 25));
    expect(new Set(picks).size).toBe(8);
  });
});
