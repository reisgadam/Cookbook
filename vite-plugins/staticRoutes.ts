import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig, Rollup } from "vite";
import { CATEGORIES } from "../src/data/categories";
import { NOTEBOOK_INDEX_PHOTO } from "../src/data/keepsakes";
import {
  familyPhotoPath,
  familySrcSetFor,
  LEAD_PHOTO_SIZES,
  ogImagePath,
  photoPath,
  photoSrcSetFor,
  type PhotoSize,
} from "../src/data/photoPaths";
import { buildRecipe, slugFromPath } from "../src/data/recipeModel";
import { site } from "../src/site.config";
import type { Recipe } from "../src/types/recipe";

// GitHub Pages serves plain files, so a link like /Cookbook/recipes/apple-pie
// would 404 without a file at that path. After each build this writes an
// index.html for every page, each with its own title, description and
// link-preview image, plus 404.html for anything else.
//
// Each page also tells the browser what it will need (the fonts, the page's
// code and its first big photo) so they download alongside the main script
// instead of one after another. That's most of what makes a shared recipe
// link open quickly on a phone.

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
  /** The page's code, when src/router.tsx loads it separately. */
  module?: string;
  /** The page's first big photo, with the `sizes` its <img> uses. */
  leadPhoto?: { file: string; family?: boolean; sizes: string };
}

/** What the build produced that pages can ask for early. */
interface BuildAssets {
  base: string;
  /** Font files used on every page (other alphabets and styles load when used). */
  fonts: string[];
  /** For each separately loaded page module: its scripts and stylesheets. */
  modules: Map<string, { js: string[]; css: string[] }>;
  photos: {
    photos: Record<string, { widths: Record<PhotoSize, number> }>;
    family: Record<string, { widths: number[] }>;
  };
}

// The body text and heading fonts. Without these, text first appears in a
// fallback font and moves when they arrive.
const CRITICAL_FONTS = [
  /\/source-sans-3-latin-wght-normal-[\w-]+\.woff2$/,
  /\/fraunces-latin-opsz-normal-[\w-]+\.woff2$/,
];

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
    module: "src/pages/RecipeDetail.tsx",
    leadPhoto: recipe.sourceImages[0]
      ? { file: recipe.sourceImages[0], sizes: LEAD_PHOTO_SIZES.original }
      : undefined,
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

function leadPhotoTag(photo: NonNullable<PageMeta["leadPhoto"]>, assets: BuildAssets): string | undefined {
  const { base } = assets;
  let href: string;
  let srcset: string;
  if (photo.family) {
    const info = assets.photos.family[photo.file];
    if (!info) return undefined;
    href = base + familyPhotoPath(photo.file, info.widths[1] ?? info.widths[0]);
    srcset = familySrcSetFor(base, photo.file, info.widths);
  } else {
    const info = assets.photos.photos[photo.file];
    if (!info) return undefined;
    href = base + photoPath(photo.file, "md");
    srcset = photoSrcSetFor(base, photo.file, info.widths);
  }
  // The same srcset and sizes as the page's <img>, so the browser picks the same file.
  return `<link rel="preload" as="image" href="${escapeHtml(href)}" imagesrcset="${escapeHtml(srcset)}" imagesizes="${escapeHtml(photo.sizes)}" />`;
}

/** Early downloads that can go anywhere in <head>. */
function preloadTags(meta: PageMeta, assets: BuildAssets): string {
  const tags = assets.fonts.map(
    (file) => `<link rel="preload" href="${assets.base}${file}" as="font" type="font/woff2" crossorigin />`,
  );
  const photo = meta.leadPhoto && leadPhotoTag(meta.leadPhoto, assets);
  if (photo) tags.push(photo);
  return tags.join("\n    ");
}

/**
 * The page's own code. It goes after the main stylesheet, where Vite would
 * put it, so page styles still win over the global ones they refine.
 */
function pageCodeTags(meta: PageMeta, assets: BuildAssets): string {
  const code = meta.module ? assets.modules.get(meta.module) : undefined;
  if (!code) return "";
  return [
    ...code.css.map((file) => `<link rel="stylesheet" crossorigin href="${assets.base}${file}">`),
    ...code.js.map((file) => `<link rel="modulepreload" crossorigin href="${assets.base}${file}">`),
  ]
    .map((tag) => `\n  ${tag}`)
    .join("");
}

export function renderPage(template: string, meta: PageMeta, assets?: BuildAssets): string {
  const pageTitle = meta.documentTitle ?? `${meta.title} · ${site.title}`;
  if (!template.includes("<!--seo-->")) throw new Error("index.html is missing the <!--seo--> placeholder");
  const head = [headTags(meta), assets ? preloadTags(meta, assets) : ""].filter(Boolean).join("\n    ");
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(pageTitle)}</title>`)
    .replace("<!--seo-->", head)
    .replace("</head>", `${assets ? pageCodeTags(meta, assets) : ""}\n  </head>`);
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
      leadPhoto: { file: site.heroPhoto, family: true, sizes: LEAD_PHOTO_SIZES.homePortrait },
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
      image: ogImagePath(NOTEBOOK_INDEX_PHOTO),
      imageAlt: `The handwritten index of ${site.name}'s recipe notebook`,
      module: "src/pages/Notebook.tsx",
      leadPhoto: { file: NOTEBOOK_INDEX_PHOTO, sizes: LEAD_PHOTO_SIZES.notebookIndex },
    },
    {
      path: "about/",
      title: `About ${site.name}`,
      description: `Remembering ${site.name}, and a place to share your memories of her.`,
      image: HOME_IMAGE,
      imageAlt: site.heroPhotoAlt,
      module: "src/pages/About.tsx",
      leadPhoto: { file: site.heroPhoto, family: true, sizes: LEAD_PHOTO_SIZES.aboutPortrait },
    },
    {
      path: "favorites/",
      title: "My Recipe Box",
      description: "Recipes you've saved on this device.",
      image: HOME_IMAGE,
      imageAlt: site.heroPhotoAlt,
      noindex: true,
      module: "src/pages/Favorites.tsx",
    },
    {
      path: "admin/",
      title: "Moderation",
      description: "Site owner's page.",
      image: HOME_IMAGE,
      imageAlt: site.heroPhotoAlt,
      noindex: true,
      module: "src/pages/Admin.tsx",
    },
  ];

  for (const category of CATEGORIES) {
    const inCategory = recipes
      .filter((r) => r.category === category.slug)
      .sort((a, b) => a.title.localeCompare(b.title));
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

/** Scripts and stylesheets each separately loaded page needs, beyond what every page loads. */
function pageModules(bundle: Rollup.OutputBundle, root: string): BuildAssets["modules"] {
  const chunks = new Map<string, Rollup.OutputChunk>();
  for (const output of Object.values(bundle))
    if (output.type === "chunk") chunks.set(output.fileName, output);
  const collect = (file: string, into: Set<string>) => {
    if (into.has(file)) return into;
    into.add(file);
    for (const dependency of chunks.get(file)?.imports ?? []) collect(dependency, into);
    return into;
  };
  const everywhere = new Set<string>();
  for (const chunk of chunks.values()) if (chunk.isEntry) collect(chunk.fileName, everywhere);

  // Keyed by every module in the chunk: a chunk that shares code with another
  // lazily loaded one (cook mode reuses the recipe page's) has no single "facade" module.
  const modules: BuildAssets["modules"] = new Map();
  for (const chunk of chunks.values()) {
    if (!chunk.isDynamicEntry) continue;
    const js = [...collect(chunk.fileName, new Set())].filter((file) => !everywhere.has(file));
    const css = js.flatMap((file) => [...(chunks.get(file)?.viteMetadata?.importedCss ?? [])]);
    for (const id of chunk.moduleIds)
      modules.set(path.relative(root, id).split(path.sep).join("/"), { js, css });
  }
  return modules;
}

export function staticRoutes(): Plugin {
  let config: ResolvedConfig;
  let fonts: string[] = [];
  let modules: BuildAssets["modules"] = new Map();
  return {
    name: "cookbook-static-routes",
    apply: "build",
    configResolved(resolved) {
      config = resolved;
    },
    generateBundle(_, bundle) {
      fonts = Object.keys(bundle).filter((file) =>
        CRITICAL_FONTS.some((pattern) => pattern.test(`/${file}`)),
      );
      modules = pageModules(bundle, config.root);
    },
    closeBundle() {
      const outDir = path.resolve(config.root, config.build.outDir);
      const template = readFileSync(path.join(outDir, "index.html"), "utf8");
      const recipes = loadRecipes(config.root);
      const pages = sitePages(recipes);
      const assets: BuildAssets = {
        base: config.base,
        fonts,
        modules,
        photos: JSON.parse(readFileSync(path.join(config.root, "src/generated/photos.json"), "utf8")),
      };
      for (const page of pages) {
        if (page.module && !modules.has(page.module)) {
          config.logger.warn(
            `static routes: ${page.module} isn't loaded separately, so it can't be preloaded`,
          );
        }
      }

      for (const page of pages) {
        const dir = path.join(outDir, page.path);
        mkdirSync(dir, { recursive: true });
        writeFileSync(path.join(dir, "index.html"), renderPage(template, page, assets));
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
      writeFileSync(path.join(outDir, "404.html"), renderPage(template, notFound, assets));

      // The copy the service worker serves for every address once it's
      // installed: nothing page-specific, so it doesn't fetch one page's photo
      // for another. The page's code sets the title once it runs.
      const shell: PageMeta = {
        path: "",
        title: site.title,
        documentTitle: site.title,
        description: site.description,
        image: HOME_IMAGE,
        imageAlt: site.heroPhotoAlt,
        noindex: true,
        noCanonical: true,
      };
      writeFileSync(path.join(outDir, "shell.html"), renderPage(template, shell, assets));

      if (site.indexable) {
        const urls = pages
          .filter((p) => !p.noindex)
          .map((p) => `  <url><loc>${site.url}${p.path}</loc></url>`);
        writeFileSync(
          path.join(outDir, "sitemap.xml"),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
        );
      }

      config.logger.info(`\n  static routes: wrote ${pages.length} pages, 404.html and shell.html`);
    },
  };
}
