import { Link } from "react-router";
import { SurpriseButton } from "../components/SurpriseButton";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import styles from "./NotFound.module.css";

export function NotFound({ title = "We couldn’t find that page" }: { title?: string }) {
  useDocumentTitle("Page not found");
  return (
    <div className={`page ${styles.page}`}>
      <p className={`hand ${styles.kicker}`}>Hmm, that page isn’t in the recipe box.</p>
      <h1>{title}</h1>
      <p className={styles.text}>
        The link may be mistyped, or the recipe may have a new name. Try searching, or let the dice pick
        something good.
      </p>
      <div className={styles.actions}>
        <Link to="/recipes" className="btn btn-primary">
          Browse all recipes
        </Link>
        <SurpriseButton />
        <Link to="/" className="btn btn-ghost">
          Go home
        </Link>
      </div>
    </div>
  );
}
