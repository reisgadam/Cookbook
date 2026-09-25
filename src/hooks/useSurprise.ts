import { useCallback } from "react";
import { useNavigate } from "react-router";
import { recipes as allRecipes } from "../data/recipes";
import { pickRandom } from "../lib/random";
import type { Recipe } from "../types/recipe";

export interface SurpriseState {
  surprise: true;
  /** Slugs of the pool the pick came from, so "Spin again" stays in it. */
  pool?: string[];
}

/** Returns a function that opens a random recipe from `pool`. */
export function useSurprise() {
  const navigate = useNavigate();
  return useCallback(
    (pool: Recipe[] = allRecipes, exclude?: string) => {
      const choice = pickRandom(pool, { exclude });
      if (!choice) return;
      const state: SurpriseState = {
        surprise: true,
        pool: pool.length < allRecipes.length ? pool.map((r) => r.slug) : undefined,
      };
      navigate(`/recipes/${choice.slug}`, { state, viewTransition: true });
    },
    [navigate],
  );
}
