import { recipes } from "../data/recipes";
import { RecipeCard } from "../components/RecipeCard";

export function Home() {
  return (
    <div>
      <h1>Mom's Recipes</h1>
      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.slug} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}
