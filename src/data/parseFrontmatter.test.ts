import { describe, expect, it } from "vitest";
import { parseFrontmatter } from "./parseFrontmatter";

describe("parseFrontmatter", () => {
  it("parses quoted strings, arrays, numbers and booleans", () => {
    const { data, body } = parseFrontmatter(
      [
        "---",
        'title: "Mom\'s Chicken Pie"',
        "slug: moms-chicken-pie",
        "tags: [chicken, holiday]",
        "notebookPage: 24",
        "partial: true",
        'notes: "Bake at 350°F: layers 30 min."',
        "---",
        "",
        "## Ingredients",
      ].join("\n"),
    );
    expect(data).toEqual({
      title: "Mom's Chicken Pie",
      slug: "moms-chicken-pie",
      tags: ["chicken", "holiday"],
      notebookPage: 24,
      partial: true,
      notes: "Bake at 350°F: layers 30 min.",
    });
    expect(body).toBe("## Ingredients");
  });

  it("keeps quoted numbers as strings", () => {
    const { data } = parseFrontmatter('---\nyield: "12"\n---\n');
    expect(data.yield).toBe("12");
  });

  it("returns the whole input as the body when there is no frontmatter", () => {
    expect(parseFrontmatter("Just text")).toEqual({ data: {}, body: "Just text" });
  });

  it("handles Windows line endings", () => {
    const { data, body } = parseFrontmatter("---\r\ntitle: Pie\r\n---\r\nBody");
    expect(data.title).toBe("Pie");
    expect(body).toBe("Body");
  });
});
