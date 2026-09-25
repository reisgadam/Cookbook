# Mom's Recipes

A family cookbook site, built with React + TypeScript (Vite) and deployed to
GitHub Pages.

## Project layout

```
public/recipes/images/   Original photographed recipe cards (source material)
content/recipes/         Transcribed recipes as Markdown, one file per recipe
src/                     The website (components, pages, data loading)
```

Each file in `content/recipes/` has frontmatter pointing back at the source
photo(s) it was transcribed from, e.g.:

```md
---
title: "Grandma's Apple Pie"
slug: grandmas-apple-pie
sourceImages: [IMG_5698.JPG, IMG_5699.JPG]
---

## Ingredients
...
## Instructions
...
```

The site reads every file in `content/recipes/` at build time
(`src/data/recipes.ts`) — no separate database or CMS needed.

## Development

```
npm install
npm run dev
```

## Build

```
npm run build
npm run preview
```

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site
and publishes it to GitHub Pages. Enable Pages for this repo under
**Settings → Pages → Source: GitHub Actions** once this is merged.
