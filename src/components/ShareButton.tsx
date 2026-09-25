import { Share2 } from "lucide-react";
import { useToast } from "./Toast";

interface Props {
  /** Path inside the site, e.g. "recipes/apple-pie". */
  path: string;
  title: string;
  text?: string;
  className?: string;
}

/** The phone's share sheet where there is one; otherwise copies the link. */
export function ShareButton({ path, title, text, className = "" }: Props) {
  const toast = useToast();

  const onClick = async () => {
    // The trailing slash matches the pre-rendered page, so links open without a redirect.
    const url = `${window.location.origin}${import.meta.env.BASE_URL}${path.replace(/^\/|\/$/g, "")}/`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied. Paste it into a text or email.");
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  return (
    <button type="button" className={`btn btn-secondary ${className}`} onClick={onClick}>
      <Share2 aria-hidden="true" />
      Share
    </button>
  );
}
