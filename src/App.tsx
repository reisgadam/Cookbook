import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { RecipeDetail } from "./pages/RecipeDetail";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="recipes/:slug" element={<RecipeDetail />} />
      </Route>
    </Routes>
  );
}
