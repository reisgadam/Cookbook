import type { CategorySlug } from "../types/recipe";

/** Names of the line icons in src/components/CategoryIcon.tsx. */
export type CategoryIconName =
  | "platter"
  | "soup"
  | "pot"
  | "carrot"
  | "croissant"
  | "cake"
  | "slice"
  | "cookie"
  | "dessert"
  | "candy"
  | "drink";

export interface CategoryInfo {
  slug: CategorySlug;
  label: string;
  blurb: string;
  icon: CategoryIconName;
}

/** In menu order: savory first, then sweets, then drinks. */
export const CATEGORIES: CategoryInfo[] = [
  {
    slug: "appetizers",
    label: "Appetizers & Snacks",
    blurb: "Dips, bites and party platters",
    icon: "platter",
  },
  {
    slug: "soups-salads",
    label: "Soups & Salads",
    blurb: "Wedding soup, pasta fazool and more",
    icon: "soup",
  },
  { slug: "mains", label: "Main Dishes", blurb: "Sunday dinners and weeknight suppers", icon: "pot" },
  { slug: "sides", label: "Sides", blurb: "Potatoes, rice and homemade pickles", icon: "carrot" },
  {
    slug: "breads-breakfast",
    label: "Breads & Breakfast",
    blurb: "Muffins, loaves and coffee cake",
    icon: "croissant",
  },
  { slug: "cakes", label: "Cakes", blurb: "Pound cakes, layer cakes and icebox cakes", icon: "cake" },
  {
    slug: "pies-tarts",
    label: "Pies & Tarts",
    blurb: "Apple pie, meringue pie and fruit tarts",
    icon: "slice",
  },
  {
    slug: "cookies-bars",
    label: "Cookies, Bars & Candy",
    blurb: "Brownies, cookies and fudge",
    icon: "cookie",
  },
  {
    slug: "desserts",
    label: "Desserts & Treats",
    blurb: "Mousse, churros, frozen treats and more",
    icon: "dessert",
  },
  {
    slug: "frostings-sauces",
    label: "Frostings & Sauces",
    blurb: "Icings, toppings and chocolate sauce",
    icon: "candy",
  },
  { slug: "drinks", label: "Drinks", blurb: "Punch, cocktails, shakes and hot chocolate", icon: "drink" },
];

const bySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string): CategoryInfo | undefined {
  return bySlug.get(slug as CategorySlug);
}

export function isCategorySlug(slug: string): slug is CategorySlug {
  return bySlug.has(slug as CategorySlug);
}
