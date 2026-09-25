import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "./parseFrontmatter";
import { buildRecipe, listItems, splitSections, toPlainText } from "./recipeModel";

const RAW = `---
title: "Apple Turnovers"
slug: apple-turnovers
category: pies-tarts
tags: [apple, fruit]
source: card
oven: "425°F"
sourceImages: [IMG_5814.JPG, IMG_5815.JPG]
---

## Ingredients

**Dough**
- 2¼ cups all-purpose flour
- 1 teaspoon *salt*

## Instructions

1. Sift the flour.
2. Cut in the shortening.

> The last line was hard to read.

### Syrup

Mix and simmer.
`;

describe("splitSections", () => {
  it("splits at level-2 headings and keeps level-3 headings inside", () => {
    const sections = splitSections(parseFrontmatter(RAW).body);
    expect(sections.map((s) => [s.heading, s.kind])).toEqual([
      ["Ingredients", "ingredients"],
      ["Instructions", "instructions"],
    ]);
    expect(sections[1].markdown).toContain("### Syrup");
  });

  it("classifies ingredient and method variants", () => {
    const sections = splitSections("## Ingredients (partial)\n- x\n\n## Basic method\nDo it\n\n## Purple Cow\nMix");
    expect(sections.map((s) => s.kind)).toEqual(["ingredients", "instructions", "other"]);
  });

  it("keeps text that comes before the first heading", () => {
    expect(splitSections("Intro\n\n## Ingredients\n- a")[0]).toMatchObject({ heading: "", kind: "other", markdown: "Intro" });
  });
});

describe("toPlainText", () => {
  it("strips markdown syntax", () => {
    expect(toPlainText("> **Note:** use *fresh* dill\n\n| a | b |\n| --- | --- |\n| 1 | 2 |")).toBe("Note: use fresh dill a b 1 2");
  });
});

describe("listItems", () => {
  it("returns bullet or numbered items as plain text", () => {
    const md = "- one\n- **two**\n1. first\n2. second";
    expect(listItems(md, "bullet")).toEqual(["one", "two"]);
    expect(listItems(md, "numbered")).toEqual(["first", "second"]);
  });
});

describe("buildRecipe", () => {
  it("builds a typed recipe with derived fields", () => {
    const recipe = buildRecipe(RAW, "fallback");
    expect(recipe).toMatchObject({
      title: "Apple Turnovers",
      slug: "apple-turnovers",
      category: "pies-tarts",
      tags: ["apple", "fruit"],
      source: "card",
      oven: "425°F",
      partial: false,
      sourceImages: ["IMG_5814.JPG", "IMG_5815.JPG"],
      ingredients: ["2¼ cups all-purpose flour", "1 teaspoon salt"],
      steps: ["Sift the flour.", "Cut in the shortening."],
    });
    expect(recipe.text).toContain("Sift the flour");
  });

  it("falls back to paragraphs when instructions have no numbered steps", () => {
    const recipe = buildRecipe("---\ntitle: X\n---\n## Instructions\n\nMix it all.\n\n> Transcriber aside", "x");
    expect(recipe.steps).toEqual(["Mix it all."]);
  });

  it("uses the file name when the slug is missing", () => {
    expect(buildRecipe("---\ntitle: Pie\n---\nBody", "pie").slug).toBe("pie");
  });
});
