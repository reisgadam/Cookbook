import { expect, test } from "@playwright/test";

test.describe("a recipe page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("recipes/moms-chicken-pie/");
  });

  test("shows her recipe next to a photo of the original", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1, name: "Mom's Chicken Pie" })).toBeVisible();
    await expect(page.getByRole("link", { name: "page 24" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
    await expect(
      page.getByRole("checkbox", { name: "4 cups bite-size pieces cooked chicken" }),
    ).toBeVisible();
    const original = page.getByRole("complementary", { name: "The original recipe" });
    await expect(original.getByRole("img").first()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Main Dishes");
  });

  test("remembers the ingredients you've checked off", async ({ page }) => {
    const chicken = page.getByRole("checkbox", { name: "4 cups bite-size pieces cooked chicken" });
    await chicken.check();
    await page.reload();
    await expect(chicken).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "2 teaspoons baking powder" })).not.toBeChecked();
  });

  test("opens the original card in a zoomable viewer", async ({ page }) => {
    await page
      .getByRole("complementary", { name: "The original recipe" })
      .getByRole("button", { name: /zoom in/i })
      .first()
      .click();
    const viewer = page.locator(".yarl__container");
    await expect(viewer).toBeVisible();
    await expect(viewer.locator("img").first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
  });

  test("cook mode walks through the steps", async ({ page }) => {
    await page.getByRole("button", { name: "Cook mode" }).click();
    const cook = page.getByRole("dialog", { name: "Mom's Chicken Pie" });
    await expect(cook).toBeVisible();
    await expect(cook.getByText("Step 1 of 4")).toBeVisible();
    await cook.getByRole("button", { name: "Next step" }).click();
    await expect(cook.getByText("Step 2 of 4")).toBeVisible();
    await cook.getByRole("button", { name: "Back" }).click();
    await expect(cook.getByText("Step 1 of 4")).toBeVisible();
    await cook.getByRole("button", { name: "Done cooking" }).click();
    await expect(cook).toBeHidden();
  });

  test("saves to My Recipe Box", async ({ page }) => {
    const save = page.getByRole("button", { name: "Save", exact: true });
    await save.click();
    await expect(page.getByRole("button", { name: "Saved", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByText("Saved “Mom's Chicken Pie” to your Recipe Box")).toBeVisible();
    await page.goto("favorites/");
    await expect(page.getByRole("heading", { level: 1, name: "My Recipe Box" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: /saved recipe/ }).getByRole("link", { name: "Mom's Chicken Pie" }),
    ).toBeVisible();
  });

  test("prints just the recipe", async ({ page }) => {
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("heading", { level: 1, name: "Mom's Chicken Pie" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ingredients" })).toBeVisible();
    await expect(page.getByRole("banner")).toBeHidden();
    await expect(page.getByRole("contentinfo")).toBeHidden();
    await expect(page.getByRole("button", { name: "Cook mode" })).toBeHidden();
  });

  test("links to related recipes and the next one in the category", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "More like this" })).toBeVisible();
    const pager = page.getByRole("navigation", { name: "More Main Dishes" });
    await expect(pager.getByRole("link")).not.toHaveCount(0);
  });
});

test("partial recipes are labelled and ask for help", async ({ page }) => {
  await page.goto("recipes/apple-pie/");
  await expect(page.getByRole("heading", { level: 1, name: "Apple Pie" })).toBeVisible();
  await expect(page.getByText("Partial recipe", { exact: true })).toBeVisible();
  await expect(page.getByText(/If you remember how Mom made it/)).toBeVisible();
});

test("recipes link to each other", async ({ page }) => {
  await page.goto("recipes/lemon-meringue-pie/");
  await page.getByRole("link", { name: "Pie Meringue", exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/pie-meringue$/);
  await expect(page.getByRole("heading", { level: 1, name: "Pie Meringue" })).toBeVisible();
});
