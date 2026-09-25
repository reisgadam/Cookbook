import { recipes } from "../data/recipes";
import { RecipeCard } from "../components/RecipeCard";

export function Home() {
  return (
    <div>
      <div className="hero">
        <img
          src={`${import.meta.env.BASE_URL}images/mom-and-dad.jpg`}
          alt="Mom and Dad"
          className="hero-image"
        />
        <h1>Mom's Recipes</h1>
      </div>
      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <RecipeCard key={recipe.slug} recipe={recipe} />
        ))}
      </div>
    </div>
  );
}
