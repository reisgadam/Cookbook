import { Bookmark, BookmarkCheck } from "lucide-react";
import { useRecipeBox } from "../hooks/useRecipeBox";
import { useToast } from "./Toast";

interface Props {
  slug: string;
  title: string;
  /** "icon" for tiles, "button" for the recipe page's action bar. */
  variant?: "icon" | "button";
  className?: string;
}

/** Saves a recipe to "My Recipe Box" on this device. */
export function SaveButton({ slug, title, variant = "icon", className = "" }: Props) {
  const { isSaved, toggle } = useRecipeBox();
  const toast = useToast();
  const saved = isSaved(slug);
  const Icon = saved ? BookmarkCheck : Bookmark;

  const onClick = () => {
    const nowSaved = toggle(slug);
    toast(nowSaved ? `Saved “${title}” to your Recipe Box` : `Removed “${title}” from your Recipe Box`);
  };

  if (variant === "button") {
    return (
      <button type="button" className={`btn btn-secondary ${className}`} aria-pressed={saved} onClick={onClick}>
        <Icon aria-hidden="true" />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-pressed={saved}
      aria-label={`Save ${title} to your Recipe Box`}
      title={saved ? "Saved to your Recipe Box" : "Save to your Recipe Box"}
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
    </button>
  );
}
