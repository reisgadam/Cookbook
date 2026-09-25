import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { NotFound } from "./NotFound";
import styles from "./NotFound.module.css";

const RELOAD_FLAG = "moms-recipes:reloaded-for-update";

/** After a new deploy, an open tab may ask for page code that no longer exists. */
function isStaleChunk(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(message);
}

export function RouteError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;

  if (isStaleChunk(error)) {
    let reloaded = false;
    try {
      reloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
      sessionStorage.setItem(RELOAD_FLAG, "1");
    } catch {
      // ignore
    }
    if (!reloaded) {
      window.location.reload();
      return null;
    }
  }

  return (
    <main className={`page ${styles.page}`}>
      <p className={`hand ${styles.kicker}`}>Oh dear, something boiled over.</p>
      <h1>Something went wrong</h1>
      <p className={styles.text}>Reloading the page usually fixes it. If it keeps happening, try again a little later.</p>
      <div className={styles.actions}>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload the page
        </button>
        <Link to="/" className="btn btn-secondary" reloadDocument>
          Go home
        </Link>
      </div>
    </main>
  );
}
