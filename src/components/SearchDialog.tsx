import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { ArrowRight, Dices, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { CATEGORIES, getCategory } from "../data/categories";
import { getRecipeBySlug, recipes } from "../data/recipes";
import { categoryCounts } from "../data/stats";
import { useRecentlyViewed } from "../hooks/useRecipeBox";
import { useSurprise } from "../hooks/useSurprise";
import {
  FIELD_LABELS,
  foldCase,
  getSearchIndex,
  searchRecipes,
} from "../lib/search";
import type { Recipe } from "../types/recipe";
import { CategoryIcon } from "./CategoryIcon";
import { Highlight } from "./Highlight";
import styles from "./SearchDialog.module.css";

const MAX_RESULTS = 8;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** The ⌘K / "/" quick search, available on every page. */
export default function SearchDialog({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const surprise = useSurprise();
  const { recent } = useRecentlyViewed();
  const trimmed = query.trim();

  const hits = useMemo(
    () => searchRecipes(getSearchIndex(recipes), trimmed),
    [trimmed],
  );
  const categories = useMemo(
    () =>
      trimmed
        ? CATEGORIES.filter((c) =>
            foldCase(c.label).includes(foldCase(trimmed)),
          )
        : CATEGORIES,
    [trimmed],
  );
  const recentRecipes = recent
    .map(getRecipeBySlug)
    .filter((r): r is Recipe => Boolean(r))
    .slice(0, 5);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path, { viewTransition: true });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog} aria-describedby={undefined}>
          <Dialog.Title className="visually-hidden">
            Search recipes
          </Dialog.Title>
          <Command
            label="Search recipes"
            shouldFilter={false}
            loop
            className={styles.command}
          >
            <div className={styles.inputRow}>
              <Search aria-hidden="true" className={styles.searchIcon} />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search recipes or ingredients…"
                className={styles.input}
              />
              <kbd className={styles.esc}>esc</kbd>
            </div>

            <Command.List className={styles.list}>
              {trimmed && (
                <Command.Empty className={styles.empty}>
                  No recipes match “{trimmed}”. Try an ingredient, like “lemon”
                  or “chicken”.
                </Command.Empty>
              )}

              {trimmed && hits.length > 0 && (
                <Command.Group
                  heading={`Recipes (${hits.length})`}
                  className={styles.group}
                >
                  {hits.slice(0, MAX_RESULTS).map((hit) => {
                    const recipe = getRecipeBySlug(hit.slug);
                    if (!recipe) return null;
                    const where =
                      hit.fields[0] && hit.fields[0] !== "title"
                        ? `Found in ${FIELD_LABELS[hit.fields[0]]}`
                        : null;
                    return (
                      <Command.Item
                        key={recipe.slug}
                        value={`recipe:${recipe.slug}`}
                        onSelect={() => go(`/recipes/${recipe.slug}`)}
                        className={styles.item}
                      >
                        <CategoryIcon
                          category={recipe.category}
                          className={styles.itemIcon}
                        />
                        <span className={styles.itemText}>
                          <span className={styles.itemTitle}>
                            <Highlight text={recipe.title} query={trimmed} />
                          </span>
                          <span className={styles.itemMeta}>
                            {getCategory(recipe.category)?.label}
                            {where && ` · ${where}`}
                          </span>
                        </span>
                      </Command.Item>
                    );
                  })}
                  {hits.length > MAX_RESULTS && (
                    <Command.Item
                      value="all-results"
                      onSelect={() =>
                        go(`/recipes?q=${encodeURIComponent(trimmed)}`)
                      }
                      className={styles.item}
                    >
                      <ArrowRight
                        aria-hidden="true"
                        className={styles.itemIcon}
                      />
                      <span className={styles.itemTitle}>
                        See all {hits.length} results
                      </span>
                    </Command.Item>
                  )}
                </Command.Group>
              )}

              {!trimmed && recentRecipes.length > 0 && (
                <Command.Group
                  heading="Recently viewed"
                  className={styles.group}
                >
                  {recentRecipes.map((recipe) => (
                    <Command.Item
                      key={recipe.slug}
                      value={`recent:${recipe.slug}`}
                      onSelect={() => go(`/recipes/${recipe.slug}`)}
                      className={styles.item}
                    >
                      <CategoryIcon
                        category={recipe.category}
                        className={styles.itemIcon}
                      />
                      <span className={styles.itemTitle}>{recipe.title}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {categories.length > 0 && (
                <Command.Group heading="Categories" className={styles.group}>
                  {categories.map((category) => (
                    <Command.Item
                      key={category.slug}
                      value={`category:${category.slug}`}
                      onSelect={() => go(`/category/${category.slug}`)}
                      className={styles.item}
                    >
                      <CategoryIcon
                        category={category.slug}
                        className={styles.itemIcon}
                      />
                      <span className={styles.itemTitle}>{category.label}</span>
                      <span className={styles.count}>
                        {categoryCounts[category.slug]}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {!trimmed && (
                <Command.Group heading="Can't decide?" className={styles.group}>
                  <Command.Item
                    value="surprise"
                    onSelect={() => {
                      onOpenChange(false);
                      surprise();
                    }}
                    className={styles.item}
                  >
                    <Dices aria-hidden="true" className={styles.itemIcon} />
                    <span className={styles.itemTitle}>
                      Surprise me with a random recipe
                    </span>
                  </Command.Item>
                </Command.Group>
              )}
            </Command.List>

            <div className={styles.footer} aria-hidden="true">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> to move
              </span>
              <span>
                <kbd>↵</kbd> to open
              </span>
              <span>
                <kbd>esc</kbd> to close
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
