import { Bookmark } from "lucide-react";
import { Link } from "react-router";
import { RecipeGrid, RecipeTile } from "../components/RecipeTile";
import { SurpriseButton } from "../components/SurpriseButton";
import { useCommunity } from "../community/store";
import { getRecipeBySlug } from "../data/recipes";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useRecentlyViewed, useRecipeBox } from "../hooks/useRecipeBox";
import type { Recipe } from "../types/recipe";
import styles from "./Favorites.module.css";

const toRecipes = (slugs: string[]) => slugs.map(getRecipeBySlug).filter((r): r is Recipe => Boolean(r));

export function Favorites() {
  useDocumentTitle("My Recipe Box");
  const { saved } = useRecipeBox();
  const { recent, clear } = useRecentlyViewed();
  const { counts } = useCommunity();
  const savedRecipes = toRecipes(saved);
  const recentRecipes = toRecipes(recent).slice(0, 8);
  const loves = (slug: string) => counts[`love:${slug}`] ?? 0;

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.header}>
        <p className="eyebrow">Saved on this device</p>
        <h1>My Recipe Box</h1>
        <p className={styles.lede}>
          Tap the bookmark on any recipe to keep it here. Your box is saved in this browser, so it will be
          waiting next time you visit on this device.
        </p>
      </header>

      {savedRecipes.length > 0 ? (
        <section aria-labelledby="saved-heading">
          <div className={styles.bar}>
            <h2 id="saved-heading" className={styles.count}>
              {savedRecipes.length} saved {savedRecipes.length === 1 ? "recipe" : "recipes"}
            </h2>
            <SurpriseButton pool={savedRecipes} label="Surprise me from my box" className="btn-small" />
          </div>
          <RecipeGrid>
            {savedRecipes.map((recipe) => (
              <li key={recipe.slug}>
                <RecipeTile recipe={recipe} loves={loves(recipe.slug)} />
              </li>
            ))}
          </RecipeGrid>
        </section>
      ) : (
        <div className={styles.empty}>
          <Bookmark aria-hidden="true" />
          <h2>Your recipe box is empty</h2>
          <p>Look for the bookmark on a recipe card or page, and tap it to save the recipe here.</p>
          <Link to="/recipes" className="btn btn-primary">
            Browse recipes
          </Link>
        </div>
      )}

      {recentRecipes.length > 0 && (
        <section className={styles.recent} aria-labelledby="recent-heading">
          <div className={styles.bar}>
            <h2 id="recent-heading">Recently viewed</h2>
            <button type="button" className="btn btn-ghost btn-small" onClick={clear}>
              Clear history
            </button>
          </div>
          <RecipeGrid>
            {recentRecipes.map((recipe) => (
              <li key={recipe.slug}>
                <RecipeTile recipe={recipe} loves={loves(recipe.slug)} />
              </li>
            ))}
          </RecipeGrid>
        </section>
      )}
    </div>
  );
}
