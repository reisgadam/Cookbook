import { useEffect } from "react";
import { site } from "../site.config";

/** Sets the browser tab title: "Apple Pie · Mom's Recipes". */
export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${site.title}` : site.title;
  }, [title]);
}
