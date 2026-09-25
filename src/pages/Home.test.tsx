import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommunityState } from "../community/store";

const community = vi.hoisted(() => ({ counts: {} as Record<string, number> }));

vi.mock("../community/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../community/store")>()),
  useCommunity: (): CommunityState => ({ status: "ready", counts: community.counts, mine: new Set() }),
}));

const { Home } = await import("./Home");

// The recipe cards use view transitions, which need a data router like the site's.
async function renderHome() {
  render(<RouterProvider router={createMemoryRouter([{ path: "/", element: <Home /> }])} />);
  await screen.findByRole("heading", { level: 1 });
}

const sectionHeadings = () =>
  screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

describe("home page", () => {
  beforeEach(() => {
    community.counts = {};
  });

  it("shows Family favorites after the categories, once three recipes have hearts", async () => {
    community.counts = { "love:apple-pie": 3, "love:moms-chicken-pie": 2, "love:bistro-pear-tart": 1 };
    await renderHome();
    expect(sectionHeadings()).toEqual([
      "Browse by category",
      "Family favorites",
      "This week’s picks",
      "Mom’s spiral notebook",
      "Looking for something in particular?",
    ]);
    expect(screen.queryByText(/Today from/)).toBeNull();
  });

  it("leaves out Family favorites until three recipes have hearts", async () => {
    community.counts = { "love:apple-pie": 1 };
    await renderHome();
    expect(sectionHeadings()[0]).toBe("Browse by category");
    expect(screen.queryByRole("heading", { name: "Family favorites" })).toBeNull();
  });
});
