import { Link, Outlet } from "react-router";

export function Layout() {
  return (
    <div className="site">
      <header className="site-header">
        <Link to="/" className="site-title">
          Mom's Recipes
        </Link>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <p>A family recipe collection.</p>
      </footer>
    </div>
  );
}
