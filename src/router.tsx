import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { Recipes } from "./pages/Recipes";
import { RouteError } from "./pages/RouteError";

// Home and the recipe explorer load up front; everything else loads when
// first visited. vite-plugins/staticRoutes.ts pre-renders the <head> of each
// of these paths so shared links preview nicely and open without a 404.
export const router = createBrowserRouter(
  [
    {
      Component: Layout,
      ErrorBoundary: RouteError,
      HydrateFallback: () => null,
      children: [
        { index: true, Component: Home },
        { path: "recipes", Component: Recipes },
        { path: "category/:category", Component: Recipes },
        {
          path: "recipes/:slug",
          lazy: () => import("./pages/RecipeDetail").then((m) => ({ Component: m.RecipeDetail })),
        },
        { path: "about", lazy: () => import("./pages/About").then((m) => ({ Component: m.About })) },
        { path: "notebook", lazy: () => import("./pages/Notebook").then((m) => ({ Component: m.Notebook })) },
        {
          path: "favorites",
          lazy: () => import("./pages/Favorites").then((m) => ({ Component: m.Favorites })),
        },
        { path: "admin", lazy: () => import("./pages/Admin").then((m) => ({ Component: m.Admin })) },
        { path: "*", Component: NotFound },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
