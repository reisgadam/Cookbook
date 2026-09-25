import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router";
import { useOnline } from "../hooks/useOnline";
import { useApplyPreferences } from "../hooks/usePreferences";
import { BackToTop } from "./BackToTop";
import { Footer } from "./Footer";
import { Header } from "./Header";
import styles from "./Layout.module.css";
import { ToastProvider, useToast } from "./Toast";

const SearchDialog = lazy(() => import("./SearchDialog"));
const ShortcutsDialog = lazy(() => import("./ShortcutsDialog"));

const isExplorer = (path: string) => path === "/recipes" || path.startsWith("/category/");

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || /^(input|textarea|select)$/i.test(el.tagName)));
}

export function Layout() {
  useApplyPreferences();
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);

  // "/" or Ctrl/⌘+K opens search from anywhere; "?" lists the shortcuts.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const combo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const plain = !isTyping(event.target) && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (combo || (plain && event.key === "/")) {
        event.preventDefault();
        setSearchOpen(true);
      } else if (plain && event.key === "?" && !document.querySelector('[role="dialog"]')) {
        event.preventDefault();
        setShortcutsOpen(true);
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
      <Footer onShowShortcuts={() => setShortcutsOpen(true)} />
      <BackToTop />
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        </Suspense>
      )}
      {shortcutsOpen && (
        <Suspense fallback={null}>
          <ShortcutsDialog onClose={() => setShortcutsOpen(false)} />
        </Suspense>
      )}
      <ScrollRestoration />
      <ConnectionNotice />
    </ToastProvider>
  );
}

/** A heads-up when the connection drops, so missing photos make sense. */
function ConnectionNotice() {
  const online = useOnline();
  const toast = useToast();
  useEffect(() => {
    if (!online) toast("You’re offline, but the recipes still work.");
  }, [online, toast]);
  return null;
}
