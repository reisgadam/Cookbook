import {
  Cake,
  CakeSlice,
  Candy,
  Carrot,
  CookingPot,
  Cookie,
  Croissant,
  CupSoda,
  Dessert,
  HandPlatter,
  Soup,
  type LucideProps,
} from "lucide-react";
import type { ComponentType } from "react";
import { getCategory, type CategoryIconName } from "../data/categories";

const ICONS: Record<CategoryIconName, ComponentType<LucideProps>> = {
  platter: HandPlatter,
  soup: Soup,
  pot: CookingPot,
  carrot: Carrot,
  croissant: Croissant,
  cake: Cake,
  slice: CakeSlice,
  cookie: Cookie,
  dessert: Dessert,
  candy: Candy,
  drink: CupSoda,
};

export function CategoryIcon({ category, ...props }: { category: string } & LucideProps) {
  const info = getCategory(category);
  const Icon = info ? ICONS[info.icon] : CookingPot;
  return <Icon aria-hidden="true" strokeWidth={1.75} {...props} />;
}
