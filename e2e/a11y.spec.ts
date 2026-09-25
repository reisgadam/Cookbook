import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Automated checks against WCAG 2.1 A and AA on every kind of page, in both
// themes. They catch missing labels, low contrast and broken structure; they
// don't replace trying the site with a keyboard and a screen reader.
const PAGES = [
  { name: "home", path: "./" },
  { name: "all recipes", path: "recipes/" },
  { name: "search results", path: "recipes/?q=chocolate" },
  { name: "index view", path: "recipes/?view=index" },
  { name: "category", path: "category/pies-tarts/" },
  { name: "recipe", path: "recipes/moms-chicken-pie/" },
  { name: "partial recipe", path: "recipes/apple-pie/" },
  { name: "about", path: "about/" },
  { name: "notebook", path: "notebook/" },
  { name: "recipe box", path: "favorites/" },
  { name: "not found", path: "no-such-page/" },
];

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        (value) => localStorage.setItem("moms-recipes:theme", JSON.stringify(value)),
        theme,
      );
    });

    for (const { name, path } of PAGES) {
      test(`${name} has no accessibility problems`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        // Let entrance animations finish so colours are measured at rest.
        await page.waitForTimeout(400);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const problems = results.violations.map(
          (v) =>
            `${v.impact}: ${v.id} (${v.help})\n    ${v.nodes.map((n) => n.target.join(" ")).join("\n    ")}`,
        );
        expect(problems, problems.join("\n")).toEqual([]);
      });
    }
  });
}

test("open dialogs have no accessibility problems", async ({ page, isMobile }) => {
  test.skip(isMobile, "the same dialogs as on desktop");
  await page.goto("recipes/moms-chicken-pie/");
  await page.getByRole("button", { name: "Cook mode" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(400);
  let results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  await page.keyboard.press("Escape");

  await page.keyboard.press("/");
  await expect(page.getByRole("dialog", { name: /search/i })).toBeVisible();
  await page.keyboard.type("pie");
  await page.waitForTimeout(400);
  results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});
