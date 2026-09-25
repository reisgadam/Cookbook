import { Link } from "react-router";
import { totals } from "../data/stats";
import { site } from "../site.config";
import { BrandMark } from "./BrandMark";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer role="contentinfo" className={styles.footer} data-print="hide">
      <div className={styles.lace} aria-hidden="true" />
      <div className={`page ${styles.inner}`}>
        <div className={styles.about}>
          <BrandMark className={styles.mark} />
          <div>
            <p className={styles.title}>{site.title}</p>
            <p className={`hand ${styles.dedication}`}>Made with love, so her recipes keep getting cooked.</p>
          </div>
        </div>
        <nav aria-label="Footer" className={styles.links}>
          <Link to="/recipes">All Recipes</Link>
          <Link to="/notebook">{site.name}'s Notebook</Link>
          <Link to="/about">About {site.name}</Link>
          <Link to="/favorites">My Recipe Box</Link>
        </nav>
        <p className={styles.small}>
          {totals.recipes} recipes, transcribed from her spiral notebook, recipe cards and clippings. Each one links back
          to a photo of the original.
        </p>
      </div>
    </footer>
  );
}
