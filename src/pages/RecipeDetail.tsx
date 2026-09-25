import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { getRecipeBySlug } from "../data/recipes";

export function RecipeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const recipe = slug ? getRecipeBySlug(slug) : undefined;

  if (!recipe) {
    return (
      <div>
        <p>Recipe not found.</p>
        <Link to="/">Back to all recipes</Link>
      </div>
    );
  }

  return (
    <article className="recipe-detail">
      <Link to="/" className="back-link">
        &larr; All recipes
      </Link>
      <h1>{recipe.title}</h1>
      <div className="recipe-body">
        <ReactMarkdown>{recipe.body}</ReactMarkdown>
      </div>
      {recipe.sourceImages.length > 0 && (
        <details className="source-images">
          <summary>Original recipe card</summary>
          <div className="source-images-grid">
            {recipe.sourceImages.map((img) => (
              <img
                key={img}
                src={`${import.meta.env.BASE_URL}recipes/images/${img}`}
                alt={`Source scan for ${recipe.title}`}
              />
            ))}
          </div>
        </details>
      )}
    </article>
  );
}
