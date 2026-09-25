# Mom's Recipes

Mom's recipe notebook, recipe cards and clippings as a family cookbook
website, published with GitHub Pages at
<https://reisgadam.github.io/Cookbook/>.

Every recipe links back to photos of the original in her handwriting. The site
is unlisted: search engines are asked not to index it, so it's found through
the link.

## What's on the site

- **Search** by recipe name or ingredient, forgiving typos ("brocoli" finds
  broccoli), from the home page, the recipe list, or anywhere with `/`.
- **Categories and tags** (Cakes, Main Dishes…; chocolate, holiday,
  make-ahead…), a card view and an A–Z index, all in shareable links.
- **Surprise me**: a random recipe from everything, or from the current list.
- **Recipe pages** with the original photos (tap to zoom and download),
  ingredient checklists that remember what's ticked, print-friendly layout,
  sharing, and related recipes.
- **Cook mode**: one step at a time in large type, with the screen kept awake.
- **Hearts, "I made this" and Notes & memories** on every recipe, and a
  guestbook on the About page. These need a free Firebase project; see
  [docs/COMMUNITY_SETUP.md](docs/COMMUNITY_SETUP.md). Until then they stay
  hidden.
- **Her notebook**: her table of contents, and a flip-through of every page.
- **My Recipe Box** (saved recipes) and recently viewed, kept on each device.
- **Dark theme and larger text** settings, and it can be installed on a phone's
  home screen and works offline.

## Common tasks

- **Add or fix a recipe:** [docs/ADDING_RECIPES.md](docs/ADDING_RECIPES.md)
- **Turn on hearts and notes:** [docs/COMMUNITY_SETUP.md](docs/COMMUNITY_SETUP.md)
- **Write the About page:** edit [content/about.md](content/about.md) (the
  instructions are inside it)
- **Change the site's name or tagline:** [src/site.config.ts](src/site.config.ts)

## Project layout

```
content/recipes/        One Markdown file per recipe
content/photos/         Original photos, and photos.json (which way up each one goes)
content/about.md        The About page story
src/                    The website (React + TypeScript)
  data/                 Loads the recipes; categories, tags, photos that aren't recipes
  pages/, components/   Pages and the pieces they're built from
  community/            Hearts and notes (Firebase), loaded only when set up
  generated/photos.json Photo sizes and colours, written by npm run images
scripts/                build-images.mjs (resizes photos), build-icons.mjs
vite-plugins/           Writes a page per address, with link previews
firestore.rules         Database security rules, with tests in rules/
e2e/                    Browser tests
docs/                   Guides
```

## Development

Requires [Node.js](https://nodejs.org) 22.

| Command | What it does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Run the site at <http://localhost:5173/Cookbook/> |
| `npm run build` | Build the site into `dist/` |
| `npm run images` | Resize new or changed photos (dev and build run it) |
| `npm run lint` / `npm run typecheck` | Code checks |
| `npm test` | Unit tests, including checks of every recipe and photo |
| `npm run test:e2e` | Browser tests against the built site (run `npm run build` first) |
| `npm run test:rules` | Database rules tests (needs Java for the Firebase emulator) |
| `npm run emulators` | Run Firebase on your computer to try hearts and notes (see the community guide) |
| `npm run format` | Format the code with Prettier |

## Deployment

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
it checks the code and every recipe, builds the site, and publishes it to
GitHub Pages. If a check fails, the live site keeps the last good version.
Pull requests also run [`.github/workflows/ci.yml`](.github/workflows/ci.yml),
which adds the database rules tests and the browser tests.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub
Actions**.

## How it works

- **No database for recipes.** The Markdown files are bundled into the site
  at build time, so search and filtering run in the browser.
- **Photos** are processed by `scripts/build-images.mjs` into WebP images in
  four widths (a phone gets a 720-pixel copy; zooming gets the 2400-pixel one)
  plus link-preview images. Each one is turned upright using
  `content/photos/photos.json`. The originals aren't published.
- **Links work when shared.** GitHub Pages only serves files that exist, so the
  build writes a page for every address with its own title and preview image
  ([vite-plugins/staticRoutes.ts](vite-plugins/staticRoutes.ts)), plus a
  friendly `404.html`. Each of those pages also starts downloading its fonts,
  its code and its first photo straight away, so a shared recipe opens quickly
  on a phone.
- **Offline.** A service worker (vite-plugin-pwa) saves the site's code on the
  first visit and each photo once viewed. New versions load on the next page
  change, never in the middle of reading.
- **Hearts and notes** use Firebase with anonymous sign-in, so visitors only
  type a name. [`firestore.rules`](firestore.rules) allows one heart per
  visitor, keeps counts honest, and limits posting to once every 30 seconds.
