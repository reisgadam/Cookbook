import { expect, test } from "@playwright/test";
import { readdirSync } from "node:fs";

// Counted from the files, so adding a recipe doesn't break the test.
const recipeCount = readdirSync(new URL("../content/recipes/", import.meta.url)).filter((file) =>
  file.endsWith(".md"),
).length;

test.describe("finding a recipe", () => {
  test("the home page introduces the cookbook", async ({ page }) => {
    await page.goto("./");
    await expect(page.getByRole("heading", { level: 1, name: "Mom's Recipes" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Mom and Dad, smiling together" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "This week’s picks" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Browse by category" })).toBeVisible();
  });

  test("searching from the home page opens the matching recipes", async ({ page }) => {
    await page.goto("./");
    const search = page.getByRole("searchbox", { name: /search/i }).last();
    await search.fill("banana");
    await search.press("Enter");
    await expect(page).toHaveURL(/\/recipes\?q=banana$/);
    // Recipes with banana in the title come first, then ones that use it.
    await expect(page.getByText(/^\d+ recipes matching “banana”$/)).toBeVisible();
    await expect(page.getByRole("article").first()).toContainText("Banana");
  });

  test("search forgives typos and finds ingredients", async ({ page }) => {
    await page.goto("recipes/");
    await page.getByRole("searchbox", { name: "Search recipes or ingredients" }).fill("brocoli");
    await expect(page.getByRole("article").first()).toContainText("Broccoli");
    await expect(page).toHaveURL(/q=brocoli/);

    await page.getByRole("searchbox", { name: "Search recipes or ingredients" }).fill("buttermilk");
    await expect(page.getByRole("heading", { name: "Mom's Chicken Pie" })).toBeVisible();
  });

  test("categories and tags narrow the list and stay in the address", async ({ page }) => {
    await page.goto("recipes/");
    await expect(page.getByText(`${recipeCount} recipes`, { exact: true })).toBeVisible();

    await page
      .getByRole("navigation", { name: "Categories" })
      .getByRole("link", { name: /Cookies, Bars & Candy/ })
      .click();
    await expect(page).toHaveURL(/\/category\/cookies-bars$/);
    await expect(page.getByRole("heading", { level: 1, name: "Cookies, Bars & Candy" })).toBeVisible();
    const categoryCount = Number((await page.getByText(/^\d+ recipes?$/).textContent())?.split(" ")[0]);
    expect(categoryCount).toBeGreaterThan(3);

    const chocolate = page
      .getByRole("group", { name: "Filter by tag" })
      .getByRole("button", { name: /Chocolate/ });
    await chocolate.click();
    await expect(chocolate).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/tags=chocolate/);
    const filtered = Number((await page.getByText(/^\d+ recipes?$/).textContent())?.split(" ")[0]);
    expect(filtered).toBeLessThan(categoryCount);

    // A shared or reloaded link opens the same view.
    await page.reload();
    await expect(
      page.getByRole("group", { name: "Filter by tag" }).getByRole("button", { name: /Chocolate/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(`${filtered} recipe`, { exact: false })).toBeVisible();
  });

  test("the index view lists every recipe A to Z", async ({ page }) => {
    await page.goto("recipes/");
    await page.getByRole("group", { name: "View" }).getByRole("button", { name: "Index" }).click();
    await expect(page).toHaveURL(/view=index/);
    await expect(page.getByRole("navigation", { name: "Jump to letter" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Apple Pie", exact: true })).toBeVisible();
  });

  test("Surprise me opens a random recipe, and Spin again picks another", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("main").getByRole("button", { name: "Surprise me" }).first().click();
    await expect(page).toHaveURL(/\/recipes\/[a-z0-9-]+$/);
    const first = page.url();
    await page.getByRole("button", { name: "Spin again" }).click();
    await expect(page).not.toHaveURL(first);
    await expect(page).toHaveURL(/\/recipes\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("the search palette jumps straight to a recipe", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard shortcut");
    await page.goto("./");
    await page.keyboard.press("/");
    const palette = page.getByRole("dialog", { name: /search/i });
    await expect(palette).toBeVisible();
    await page.keyboard.type("pear tart");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/recipes\/bistro-pear-tart$/);
    await expect(page.getByRole("heading", { level: 1, name: "Bistro Pear Tart" })).toBeVisible();
  });

  test("the header search button works on any screen", async ({ page }) => {
    await page.goto("about/");
    await page
      .getByRole("banner")
      .getByRole("button", { name: /search/i })
      .first()
      .click();
    await expect(page.getByRole("dialog", { name: /search/i })).toBeVisible();
  });
});
