import type { DataRouter } from "react-router";

// Registers the service worker that vite-plugin-pwa builds (see
// vite.config.ts). It saves the site's code on the first visit so recipes
// open without a connection, and lets phones install the site as an app.
//
// After a new deploy, the new worker takes over in the background. Rather
// than reloading the page while someone is reading or typing, the next time
// they go to another page it opens with an ordinary page load, which brings
// in the new version.

let updated = false;

export function registerServiceWorker(router: DataRouter): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  const hadWorker = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // The first install takes control of the page too; only a replacement is an update.
    if (hadWorker) updated = true;
    else saveShownPhotos();
  });

  let shownPath = router.state.location.pathname;
  let leaving = false;
  router.subscribe((state) => {
    if (leaving) return;
    // A navigation that loads page code first reports where it's going before it gets there.
    const target = state.navigation.location ?? state.location;
    // Search filters and #anchors change the address too, but stay on the page.
    if (updated && target.pathname !== shownPath) {
      leaving = true;
      const href = router.createHref(target);
      const { pathname, search, hash } = window.location;
      // Back/forward has already changed the address bar; a link hasn't yet.
      if (href === pathname + search + hash) window.location.reload();
      else window.location.assign(href);
      return;
    }
    shownPath = state.location.pathname;
  });

  const register = () =>
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .catch(() => {
        // Private browsing and some in-app browsers don't allow service
        // workers; the site works the same without one.
      });
  if (document.readyState === "complete") register();
  else window.addEventListener("load", register, { once: true });
}

/**
 * The photos on the first page someone opens load before the worker is
 * running, so it never sees them. Asking for them again now (the browser
 * answers from its own cache) lets the worker save them for offline use.
 * That first page is often a recipe someone was sent a link to.
 */
function saveShownPhotos() {
  const urls = new Set(
    Array.from(document.images, (img) => img.currentSrc).filter((src) => src.includes("/photos/")),
  );
  for (const url of urls) void fetch(url).catch(() => {});
}
