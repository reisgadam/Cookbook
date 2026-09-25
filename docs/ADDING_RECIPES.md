# Adding and editing recipes

Every recipe is a small text file in [`content/recipes/`](../content/recipes),
and every photo of an original card or notebook page is in
[`content/photos/`](../content/photos). There's no database or admin screen
for recipes: you change the files, and the site rebuilds itself.

You can do everything below on the GitHub website. You don't need to install
anything.

- **When changes appear:** a few minutes after you commit to `main`. Watch the
  progress on the repository's **Actions** tab.
- **If something is wrong:** the site checks every recipe before publishing.
  If a check fails, the live site keeps the last good version and the Actions
  tab says what to fix. See [If a check fails](#if-a-check-fails).

## Fixing a typo

1. Open the recipe in [`content/recipes/`](../content/recipes). The file name
   matches the end of the recipe's web address, so
   `.../recipes/moms-chicken-pie/` is `moms-chicken-pie.md`.
2. Click the pencil icon (**Edit this file**), make the change, and click
   **Commit changes**.

## Adding a new recipe

### 1. Add the photos

In [`content/photos/`](../content/photos), click **Add file → Upload files**
and add the photos of the original (JPG or PNG). Keep the camera's names
(like `IMG_5901.JPG`), or use names with only letters, numbers and dashes, such
as `aunt-linda-apple-cake.jpg`. Spaces in names aren't allowed.

iPhones sometimes save photos as HEIC. Those only display in Safari, so upload
a JPG copy instead. On an iPhone you can set **Settings → Camera → Formats →
Most Compatible**.

### 2. Say which way up each photo goes

Recipe cards are often photographed sideways. Open
[`content/photos/photos.json`](../content/photos/photos.json) and add a line
for each new photo under `"rotations"`. The number is how far to turn the photo
clockwise so the writing reads normally:

| Number | When the photo opens looking like this |
| --- | --- |
| `0` | The writing is already upright |
| `90` | The writing runs from bottom to top (turn your head left to read it) |
| `180` | The writing is upside down |
| `270` | The writing runs from top to bottom (turn your head right to read it) |

```json
  "rotations": {
    "IMG_5901.JPG": 0,
    "IMG_5902.JPG": 270,
```

Every line except the last one in the list ends with a comma. If you're not
sure of the number, use `0` and fix it once you've seen the recipe page.

### 3. Write the recipe file

In [`content/recipes/`](../content/recipes), click **Add file → Create new
file**. Name it after the recipe, in lowercase with dashes, ending in `.md`,
for example `aunt-lindas-apple-cake.md`. Start from this example:

```md
---
title: "Aunt Linda's Apple Cake"
slug: aunt-lindas-apple-cake
category: cakes
tags: [apple, holiday]
source: card
yield: "One 9x13 cake"
oven: "350°F"
time: "Bake 45 min"
sourceImages: [IMG_5901.JPG, IMG_5902.JPG]
---

## Ingredients

- 2 cups flour
- 1 teaspoon baking soda

## Instructions

1. Heat the oven to 350°F and grease a 9x13 pan.
2. Mix the flour and baking soda.
```

The part between the `---` lines describes the recipe. The rest is the recipe
itself. Both are explained below.

### 4. Commit

Click **Commit changes**. After a few minutes the recipe is on the site, with a
link preview, in search, and in its category.

## The details at the top

| Field | Needed? | What it is |
| --- | --- | --- |
| `title` | Yes | The recipe's name, in quotation marks. |
| `slug` | Yes | The file name without `.md`. It's also the end of the recipe's web address. |
| `category` | Yes | One of the [categories](#categories). |
| `sourceImages` | Yes | The photo file names, in order, in square brackets. |
| `source` | Yes | Where it was written: `notebook` (her spiral notebook), `card` (a recipe card), `clipping` (a printed recipe she kept) or `note` (a loose note or scrap of paper). |
| `tags` | No | Any of the [tags](#tags), in square brackets, like `[chocolate, holiday]`. |
| `yield` | No | How much it makes, like `"Serves 6"` or `"About 3 dozen"`. |
| `oven` | No | Oven temperature, like `"350°F"`. |
| `time` | No | Cooking time, like `"Bake 25–30 min"`. |
| `notes` | No | A note about the original card, shown in "About the original". For example `"Dated 1-27-13 in the corner."` |
| `partial` | No | `partial: true` if part of the original is missing or torn. The page then asks visitors who remember the rest to add a note. |
| `notebookPage` | Notebook only | The page number in her notebook. |

Only fill in `yield`, `oven` and `time` when the original says so.

## The recipe text

- **Sections** start with `## `, like `## Ingredients`, `## Instructions` or
  `## Variations`.
- **Ingredients** are lines starting with `- `. On the site each one gets a
  checkbox for ticking off while you cook.
- **Steps** are numbered lines: `1. `, `2. `, and so on. Cook mode shows them
  one at a time.
- **Sub-headings** inside a section, like the crust and filling of a pie, are a
  line on its own in double asterisks: `**Crust**`.
- **Your notes** are different from her words. If you add an explanation or
  fill in something she left out, start the line with `> `. The site shows it
  as a transcriber's note, set apart from her recipe:

  ```md
  > The card doesn't say how long to bake it; about 25 minutes works.
  ```

- **Links to another recipe** use the other recipe's slug:
  `[Pie Meringue](/recipes/pie-meringue)`.
- **Tables** work too. See
  [`lemon-meringue-pie.md`](../content/recipes/lemon-meringue-pie.md) for an
  example.

## Categories

Use the word on the left in `category:`.

| `category` | Shown as |
| --- | --- |
| `appetizers` | Appetizers & Snacks |
| `soups-salads` | Soups & Salads |
| `mains` | Main Dishes |
| `sides` | Sides |
| `breads-breakfast` | Breads & Breakfast |
| `cakes` | Cakes |
| `pies-tarts` | Pies & Tarts |
| `cookies-bars` | Cookies, Bars & Candy |
| `desserts` | Desserts & Treats |
| `frostings-sauces` | Frostings & Sauces |
| `drinks` | Drinks |

## Tags

`chocolate`, `fruit`, `apple`, `lemon`, `chicken`, `beef`, `pork`, `turkey`,
`veal`, `seafood`, `pasta`, `potatoes`, `casserole`, `italian`, `mexican`,
`holiday`, `party`, `quick`, `make-ahead`, `no-bake`, `frozen`,
`kid-friendly`, `spirited` (contains alcohol) and `canning`.

New categories and tags go in
[`src/data/categories.ts`](../src/data/categories.ts) and
[`src/data/taxonomy.ts`](../src/data/taxonomy.ts).

## If a check fails

Open the **Actions** tab and the failed run. The message names the recipe and
what's wrong:

| The message says | What to do |
| --- | --- |
| `unknown category "..."` | Use one of the [categories](#categories). |
| `unknown tag "..."` | Use one of the [tags](#tags), or remove it. |
| `content/photos/... is missing` | Upload the photo, or fix the spelling in `sourceImages`. The names must match exactly, including capital letters. |
| `add ... to photos.json` | Add the photo under `"rotations"` in `photos.json`. |
| `rename the photo...` | Rename the photo without spaces or special characters, in both places. |
| `HEIC photos only display in Safari` | Upload a JPG copy instead. |
| `links to missing recipe "..."` | Fix the slug in the link. |
| `notebookPage is only for notebook recipes` | Remove `notebookPage`, or set `source: notebook`. |
| `numbers the notebook pages 1 to N` | Notebook page numbers must run 1, 2, 3… with none missing or repeated. |
| `has unique slugs and titles` | Another recipe already has that title or slug. |

Fix it, commit again, and the site publishes as soon as the checks pass.

## Other things you can change

- **The About page story** is [`content/about.md`](../content/about.md). The
  instructions are inside it.
- **Keepsakes** (photos that aren't recipes, like her tea note) are listed in
  [`src/data/keepsakes.ts`](../src/data/keepsakes.ts).
- **The site's name and tagline** are in
  [`src/site.config.ts`](../src/site.config.ts). Setting `indexable: true`
  there lets search engines list the site. It's off, so only people with the
  link find it.

## Working on your own computer

With [Node.js](https://nodejs.org) 22 installed:

```sh
npm install
npm run dev          # the site at http://localhost:5173/Cookbook/, updating as you edit
npm test             # the recipe and photo checks
```

`npm run images` processes new photos; `npm run dev` and `npm run build` run it
for you. If it changes `src/generated/photos.json`, commit that file too.
