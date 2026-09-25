import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router";
import { useApplyPreferences } from "../hooks/usePreferences";
import { Footer } from "./Footer";
import { Header } from "./Header";
import styles from "./Layout.module.css";
import { ToastProvider } from "./Toast";

const SearchDialog = lazy(() => import("./SearchDialog"));

const isExplorer = (path: string) => path === "/recipes" || path.startsWith("/category/");

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName)));
}

export function Layout() {
  useApplyPreferences();
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);

  // "/" or Ctrl/⌘+K opens search from anywhere.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const combo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const slash = event.key === "/" && !isTyping(event.target) && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (combo || slash) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // After moving to a new page, put keyboard and screen-reader focus on it,
  // except when just switching filters inside the recipe explorer.
  useEffect(() => {
    const previous = previousPath.current;
    previousPath.current = location.pathname;
    if (previous === location.pathname || (isExplorer(previous) && isExplorer(location.pathname))) return;
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <ToastProvider>
      <a href="#main" className={styles.skip}>
        Skip to content
      </a>
      <Header onOpenSearch={openSearch} />
      <main id="main" ref={mainRef} tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <Footer />
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        </Suspense>
      )}
      <ScrollRestoration />
    </ToastProvider>
  );
}
