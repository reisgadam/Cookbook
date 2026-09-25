import { Link } from "react-router";
import type { Recipe } from "../types/recipe";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const thumb = recipe.sourceImages[0];
  return (
    <Link to={`/recipes/${recipe.slug}`} className="recipe-card">
      {thumb && (
        <img
          src={`${import.meta.env.BASE_URL}recipes/images/${thumb}`}
          alt={recipe.title}
          loading="lazy"
        />
      )}
      <h3>{recipe.title}</h3>
    </Link>
  );
}
