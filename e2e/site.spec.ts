import { expect, test, type Page } from "@playwright/test";

const SITE = "https://reisgadam.github.io/Cookbook/";

async function openDisplaySettings(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  else await page.getByRole("button", { name: "Display settings" }).click();
}

test.describe("shared links", () => {
  test("every page has its own title and link preview, without being listed in search engines", async ({
    request,
  }) => {
    const pages = [
      { path: "", title: "Mom's Recipes" },
      {
        path: "recipes/moms-chicken-pie/",
        title: "Mom's Chicken Pie · Mom's Recipes",
        image: "photos/og/IMG_5740.jpg",
      },
      { path: "category/cookies-bars/", title: "Cookies, Bars & Candy · Mom's Recipes" },
      { path: "about/", title: "About Mom · Mom's Recipes" },
      { path: "notebook/", title: "Mom's Notebook · Mom's Recipes" },
    ];
    for (const { path, title, image } of pages) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      const html = await response.text();
      expect(html).toContain(`<title>${title.replace(/&/g, "&amp;")}</title>`);
      expect(html).toContain('<meta name="robots" content="noindex" />');
      expect(html).toContain(`<link rel="canonical" href="${SITE}${path}"`);
      expect(html).toMatch(
        /<meta property="og:image" content="https:\/\/reisgadam\.github\.io\/Cookbook\/photos\//,
      );
      if (image) expect(html).toContain(`content="${SITE}${image}"`);
      expect(html).toContain('rel="manifest"');
    }
  });

  test("each page starts downloading what it needs right away", async ({ request }) => {
    const recipe = await (await request.get("recipes/moms-chicken-pie/")).text();
    expect(recipe).toMatch(
      /<link rel="preload" href="[^"]+source-sans-3-latin-wght-normal-[^"]+\.woff2" as="font"/,
    );
    expect(recipe).toMatch(
      /<link rel="preload" as="image" href="\/Cookbook\/photos\/md\/IMG_5740\.webp" imagesrcset=/,
    );
    expect(recipe).toMatch(
      /<link rel="modulepreload" crossorigin href="\/Cookbook\/assets\/RecipeDetail-[^"]+\.js">/,
    );
    // Page styles come after the main stylesheet, so they still override it.
    expect(recipe.indexOf("RecipeDetail-")).toBeGreaterThan(
      recipe.indexOf('rel="stylesheet" crossorigin href="/Cookbook/assets/index-'),
    );

    const home = await (await request.get("")).text();
    expect(home).toContain('<link rel="preload" as="image" href="/Cookbook/photos/family/mom-and-dad-');
    expect(home).not.toContain("modulepreload");

    // The copy the service worker serves for every address isn't tied to one page.
    const shell = await (await request.get("shell.html")).text();
    expect(shell).not.toContain('as="image"');
    expect(shell).not.toContain("modulepreload");
  });

  test("opening a recipe link directly shows the recipe", async ({ page }) => {
    const response = await page.goto("recipes/bistro-pear-tart/");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: "Bistro Pear Tart" })).toBeVisible();
  });

  test("a link without the trailing slash still works", async ({ page }) => {
    await page.goto("recipes/bistro-pear-tart");
    await expect(page).toHaveURL(/\/recipes\/bistro-pear-tart\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Bistro Pear Tart" })).toBeVisible();
  });

  test("an address that doesn't exist gets a friendly page", async ({ page }) => {
    let response = await page.goto("recipes/grandmas-lost-recipe/");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn’t find that recipe");
    response = await page.goto("no-such-page/");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn’t find that page");
    await expect(
      page
        .getByRole("main")
        .getByRole("link", { name: /all recipes/i })
        .first(),
    ).toBeVisible();
  });
});

test.describe("reading comfort", () => {
  test("the dark theme is remembered", async ({ page, isMobile }) => {
    await page.goto("./");
    await openDisplaySettings(page, isMobile);
    // The radio buttons are drawn as a segmented control; people click the label.
    await page.locator("label").filter({ hasText: "Dark" }).click();
    await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("the text size is remembered", async ({ page, isMobile }) => {
    await page.goto("recipes/moms-chicken-pie/");
    const size = () =>
      page
        .getByRole("heading", { name: "Ingredients" })
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    const before = await size();
    await openDisplaySettings(page, isMobile);
    await page.getByRole("button", { name: "Larger text" }).click();
    await expect.poll(size).toBeGreaterThan(before);
    await page.reload();
    await expect.poll(size).toBeGreaterThan(before);
  });

  test("the skip link jumps past the header", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard");
    await page.goto("recipes/moms-chicken-pie/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("main")).toBeFocused();
  });

  test("? lists the keyboard shortcuts", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard");
    await page.goto("./");
    await page.keyboard.press("?");
    const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Search the recipes");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test("notes and hearts stay hidden until Firebase is set up", async ({ page }) => {
  await page.goto("recipes/moms-chicken-pie/");
  await expect(page.getByRole("heading", { level: 1, name: "Mom's Chicken Pie" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Notes & memories" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /love/i })).toHaveCount(0);
  await page.goto("about/");
  await expect(page.getByRole("heading", { level: 1, name: "About Mom" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Memories of Mom" })).toHaveCount(0);
});

test.describe("installable and offline", () => {
  test("the app manifest and its icons are in place", async ({ request }) => {
    const manifest = await (await request.get("manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ name: "Mom's Recipes", start_url: "/Cookbook/", display: "standalone" });
    for (const icon of manifest.icons) {
      const response = await request.get(icon.src);
      expect(response.status(), icon.src).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
    }
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(true);
  });

  test("after the first visit, recipes open without a connection", async ({ page, context }) => {
    await page.goto("./");
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 15_000 });
    await context.setOffline(true);
    try {
      await page.goto("recipes/moms-chicken-pie/");
      await expect(page.getByRole("heading", { level: 1, name: "Mom's Chicken Pie" })).toBeVisible();
      await expect(page.getByText("You’re offline, but the recipes still work.")).toBeVisible();
      // Pages never opened before work too: every recipe is in the saved copy.
      await page.goto("recipes/bistro-pear-tart/");
      await expect(page.getByRole("heading", { level: 1, name: "Bistro Pear Tart" })).toBeVisible();
      await page.goto("recipes/?q=lemon");
      await expect(page.getByRole("article").first()).toContainText(/lemon/i);
    } finally {
      await context.setOffline(false);
    }
  });
});
