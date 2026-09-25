import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import { CATEGORIES } from "../src/data/categories";
import { ogImagePath } from "../src/data/photoPaths";
import { buildRecipe, slugFromPath } from "../src/data/recipeModel";
import { site } from "../src/site.config";
import type { Recipe } from "../src/types/recipe";

// GitHub Pages serves plain files, so a link like /Cookbook/recipes/apple-pie
// would 404 without a file at that path. After each build this writes an
// index.html for every page, each with its own title, description and
// link-preview image, plus 404.html for anything else.

interface PageMeta {
  /** Path under the site root with a trailing slash, or "" for home. */
  path: string;
  title: string;
  description: string;
  /** Site-relative link-preview image. */
  image: string;
  imageAlt: string;
  type?: "website" | "article";
  /** Browser tab title; defaults to "<title> · <site title>". */
  documentTitle?: string;
  /** Pages that shouldn't be indexed even when the site is public. */
  noindex?: boolean;
  /** Omit the canonical URL (the 404 page). */
  noCanonical?: boolean;
}

const HOME_IMAGE = ogImagePath(site.heroPhoto);

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function sourceSentence(recipe: Recipe): string {
  switch (recipe.source) {
    case "notebook":
      return `From ${site.name}'s spiral notebook${recipe.notebookPage ? `, page ${recipe.notebookPage}` : ""}.`;
    case "card":
      return `From ${site.name}'s recipe cards.`;
    case "clipping":
      return `A clipping from ${site.name}'s recipe collection.`;
    default:
      return `A handwritten note from ${site.name}'s recipe collection.`;
  }
}

export function recipeMeta(recipe: Recipe): PageMeta {
  const category = CATEGORIES.find((c) => c.slug === recipe.category)?.label;
  const facts = [category, recipe.yield, recipe.time].filter(Boolean).join(" · ");
  return {
    path: `recipes/${recipe.slug}/`,
    title: recipe.title,
    description: `${facts ? `${facts}. ` : ""}${sourceSentence(recipe)}`,
    image: ogImagePath(recipe.sourceImages[0] ?? site.heroPhoto),
    imageAlt: `Photo of the original recipe for ${recipe.title}`,
    type: "article",
  };
}

function headTags(meta: PageMeta): string {
  const url = site.url + meta.path;
  const image = site.url + meta.image;
  return [
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    meta.noCanonical ? "" : `<link rel="canonical" href="${escapeHtml(url)}" />`,
    site.indexable && !meta.noindex ? "" : `<meta name="robots" content="noindex" />`,
    `<meta property="og:site_name" content="${escapeHtml(site.title)}" />`,
    `<meta property="og:type" content="${meta.type ?? "website"}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${escapeHtml(meta.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ]
    .filter(Boolean)
    .join("\n    ");
}

export function renderPage(template: string, meta: PageMeta): string {
  const pageTitle = meta.documentTitle ?? `${meta.title} · ${site.title}`;
  if (!template.includes("<!--seo-->")) throw new Error("index.html is missing the <!--seo--> placeholder");
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(pageTitle)}</title>`)
    .replace("<!--seo-->", headTags(meta));
}

export function loadRecipes(root: string): Recipe[] {
  const dir = path.join(root, "content/recipes");
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => buildRecipe(readFileSync(path.join(dir, file), "utf8"), slugFromPath(file)));
}

export function sitePages(recipes: Recipe[]): PageMeta[] {
  const notebookCount = recipes.filter((r) => r.source === "notebook").length;
  const pages: PageMeta[] = [
    {
      path: "",
      title: site.title,
      documentTitle: site.title,
      description: site.description,
      image: HOME_IMAGE,
      imageAlt: site.heroPhotoAlt,
    },
    {
      path: "recipes/",
      title: "All Recipes",
      description: `All ${recipes.length} of ${site.name}'s recipes, searchable by name or ingredient.`,
      image: HOME_IMAGE,
      imageAlt: site.heroPhotoAlt,
    },
    {
      path: "notebook/",
      title: `${site.name}'s Notebook`,
      description: `Her spiral recipe notebook, page by page: ${notebookCount} recipes and her handwritten index.`,
      image: ogImagePath("IMG_5693.JPG"),
      imageAlt: `The handwritten index of ${site.name}'s recipe notebook`,
    },
    {
      path: "about/",
      title: `About ${site.name}`,
      description: `Remembering ${site.name}, and a place to share your memories of her.`,
      image: HOME_IMAGE,
      imageAlt: site.heroPhotoAlt,
    },
    {
      path: "favorites/",
      title: "My Recipe Box",
      description: "Recipes you've saved on this device.",
      image: HOME_IMAGE,
      imageAlt: site.heroPhotoAlt,
      noindex: true,
    },
    {
      path: "admin/",
      title: "Moderation",
      description: "Site owner's page.",
      image: HOME_IMAGE,
      imageAlt: site.heroPhotoAlt,
      noindex: true,
    },
  ];

  for (const category of CATEGORIES) {
    const inCategory = recipes.filter((r) => r.category === category.slug).sort((a, b) => a.title.localeCompare(b.title));
    if (!inCategory.length) continue;
    pages.push({
      path: `category/${category.slug}/`,
      title: category.label,
      description: `${inCategory.length} recipes: ${category.blurb.toLowerCase()}.`,
      image: ogImagePath(inCategory[0].sourceImages[0]),
      imageAlt: `A recipe from ${site.name}'s ${category.label.toLowerCase()}`,
    });
  }

  for (const recipe of recipes) pages.push(recipeMeta(recipe));
  return pages;
}

export function staticRoutes(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "cookbook-static-routes",
    apply: "build",
    configResolved(resolved) {
      config = resolved;
    },
    closeBundle() {
      const outDir = path.resolve(config.root, config.build.outDir);
      const template = readFileSync(path.join(outDir, "index.html"), "utf8");
      const recipes = loadRecipes(config.root);
      const pages = sitePages(recipes);

      for (const page of pages) {
        const dir = path.join(outDir, page.path);
        mkdirSync(dir, { recursive: true });
        writeFileSync(path.join(dir, "index.html"), renderPage(template, page));
      }

      const notFound: PageMeta = {
        path: "",
        title: "Page not found",
        description: site.description,
        image: HOME_IMAGE,
        imageAlt: site.heroPhotoAlt,
        noindex: true,
        noCanonical: true,
      };
      writeFileSync(path.join(outDir, "404.html"), renderPage(template, notFound));

      if (site.indexable) {
        const urls = pages.filter((p) => !p.noindex).map((p) => `  <url><loc>${site.url}${p.path}</loc></url>`);
        writeFileSync(
          path.join(outDir, "sitemap.xml"),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
        );
      }

      config.logger.info(`\n  static routes: wrote ${pages.length} pages and 404.html`);
    },
  };
}
