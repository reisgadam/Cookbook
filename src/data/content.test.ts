// Checks every recipe file and photo, so a typo in a new recipe fails the
// build instead of breaking the site. See docs/ADDING_RECIPES.md.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../generated/photos.json";
import { isCategorySlug } from "./categories";
import { notebookRecipes, recipes } from "./recipes";
import { isTagSlug, SOURCES } from "./taxonomy";

const PHOTO_DIR = "content/photos";
/** Photos shown outside recipe pages: her notebook's index page and a note about her favorite tea. */
const NON_RECIPE_PHOTOS = ["IMG_5693.JPG", "IMG_5839.JPG"];

const recipeFiles = readdirSync("content/recipes").filter((f) => f.endsWith(".md"));
const photoFiles = readdirSync(PHOTO_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
const rotations = JSON.parse(readFileSync(`${PHOTO_DIR}/photos.json`, "utf8")).rotations as Record<string, number>;

describe("recipe content", () => {
  it("loads every recipe file", () => {
    expect(recipes).toHaveLength(recipeFiles.length);
  });

  it.each(recipes.map((r) => [r.slug, r] as const))("%s has valid metadata", (slug, recipe) => {
    expect(recipeFiles).toContain(`${slug}.md`);
    expect(recipe.title.trim()).not.toBe("");
    expect(recipe.title, "put '(torn note)' in `partial: true` instead").not.toMatch(/torn note/i);
    expect(isCategorySlug(recipe.category), `unknown category "${recipe.category}"`).toBe(true);
    for (const tag of recipe.tags) expect(isTagSlug(tag), `unknown tag "${tag}"`).toBe(true);
    expect(new Set(recipe.tags).size, "duplicate tags").toBe(recipe.tags.length);
    expect(Object.keys(SOURCES)).toContain(recipe.source);
    expect(recipe.source === "notebook", "notebookPage is only for notebook recipes").toBe(recipe.notebookPage !== undefined);
    expect(recipe.sections.length, "recipe has no content").toBeGreaterThan(0);
  });

  it.each(recipes.map((r) => [r.slug, r.sourceImages] as const))("%s has photos that exist", (_slug, images) => {
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image, "use the .JPG copy — HEIC only displays in Safari").toMatch(/\.JPG$/);
      expect(photoFiles, `content/photos/${image} is missing`).toContain(image);
      expect(manifest.photos, `run "npm run images" to process ${image}`).toHaveProperty([image]);
    }
  });

  it("has unique slugs and titles", () => {
    expect(new Set(recipes.map((r) => r.slug)).size).toBe(recipes.length);
    expect(new Set(recipes.map((r) => r.title.toLowerCase())).size).toBe(recipes.length);
  });

  it("only links to recipes that exist", () => {
    const slugs = new Set(recipes.map((r) => r.slug));
    for (const recipe of recipes) {
      for (const [, target] of recipe.body.matchAll(/\]\(\/recipes\/([^)#?/]+)\)/g)) {
        expect(slugs.has(target), `${recipe.slug} links to missing recipe "${target}"`).toBe(true);
      }
    }
  });

  it("numbers the notebook pages 1 to N with no gaps", () => {
    expect(notebookRecipes.map((r) => r.notebookPage)).toEqual(notebookRecipes.map((_, i) => i + 1));
  });
});

describe("photos", () => {
  it("has a rotation entry for every photo", () => {
    for (const photo of photoFiles) expect(rotations, `add ${photo} to photos.json`).toHaveProperty([photo]);
    for (const value of Object.values(rotations)) expect([0, 90, 180, 270]).toContain(value);
  });

  it("uses every photo somewhere", () => {
    const used = new Set([...recipes.flatMap((r) => r.sourceImages), ...NON_RECIPE_PHOTOS]);
    expect(photoFiles.filter((photo) => !used.has(photo))).toEqual([]);
  });
});
