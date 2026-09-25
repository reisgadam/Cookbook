import { ChefHat, Heart } from "lucide-react";
import type { ReactionKind } from "../../community/config";
import { reactionKey, toggleReaction, useCommunity } from "../../community/store";
import { useToast } from "../Toast";
import styles from "./ReactionButtons.module.css";

/** "Love" (the upvote) and "I made this", one each per browser. */
export function ReactionButtons({ slug }: { slug: string }) {
  const { status, counts, mine } = useCommunity();
  const toast = useToast();
  if (status === "off") return null;

  const loves = counts[reactionKey("love", slug)] ?? 0;
  const made = counts[reactionKey("made", slug)] ?? 0;
  const loved = mine.has(reactionKey("love", slug));
  const madeIt = mine.has(reactionKey("made", slug));
  const waiting = status !== "ready";

  const toggle = async (kind: ReactionKind) => {
    try {
      const on = await toggleReaction(kind, slug);
      if (on && kind === "made") toast("Thanks for making it! Her recipes live on in your kitchen.");
    } catch {
      toast("Sorry, that didn’t save. Please try again in a moment.");
    }
  };

  return (
    <div className={styles.group} role="group" aria-label="Reactions">
      <button
        type="button"
        className={`btn btn-secondary ${styles.love} ${loved ? styles.on : ""}`}
        aria-pressed={loved}
        onClick={() => toggle("love")}
        disabled={waiting}
        title={loved ? "You love this recipe" : "Love this recipe"}
      >
        <Heart aria-hidden="true" className={styles.icon} />
        Love
        <span className={styles.count}>
          {loves}
          <span className="visually-hidden"> {loves === 1 ? "heart" : "hearts"}</span>
        </span>
      </button>
      <button
        type="button"
        className={`btn btn-secondary ${styles.made} ${madeIt ? styles.on : ""}`}
        aria-pressed={madeIt}
        onClick={() => toggle("made")}
        disabled={waiting}
        title="Mark that you've cooked this"
      >
        <ChefHat aria-hidden="true" className={styles.icon} />I made this
        {made > 0 && (
          <span className={styles.count}>
            {made}
            <span className="visually-hidden"> {made === 1 ? "person has" : "people have"} made it</span>
          </span>
        )}
      </button>
    </div>
  );
}
