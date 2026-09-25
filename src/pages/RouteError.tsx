import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { NotFound } from "./NotFound";
import styles from "./NotFound.module.css";

const RELOAD_FLAG = "moms-recipes:reloaded-for-update";

/** After a new deploy, an open tab may ask for page code that no longer exists. */
function isStaleChunk(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(
    message,
  );
}

/** Reload to fetch the new version, but at most once a minute, so a reload that doesn't help can't loop. */
function claimReload(): boolean {
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOAD_FLAG)) < 60_000) return false;
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
    return true;
  } catch {
    // Without storage there's no way to tell a loop from a first try.
    return false;
  }
}

export function RouteError() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;

  if (isStaleChunk(error) && claimReload()) {
    window.location.reload();
    return null;
  }

  return (
    <main className={`page ${styles.page}`}>
      <p className={`hand ${styles.kicker}`}>Oh dear, something boiled over.</p>
      <h1>Something went wrong</h1>
      <p className={styles.text}>
        Reloading the page usually fixes it. If it keeps happening, try again a little later.
      </p>
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
