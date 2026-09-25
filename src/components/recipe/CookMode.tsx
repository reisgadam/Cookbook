import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Check, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useWakeLock } from "../../hooks/useWakeLock";
import type { Recipe } from "../../types/recipe";
import styles from "./CookMode.module.css";
import { RecipeBody } from "./RecipeBody";

interface Props {
  recipe: Recipe;
  onClose: () => void;
}

/** Big, distraction-free steps for the kitchen, with the screen kept awake. */
export default function CookMode({ recipe, onClose }: Props) {
  const steps = recipe.steps;
  const [current, setCurrent] = useState(0);
  const wakeLock = useWakeLock(true);
  const last = steps.length - 1;
  const done = current > last;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") setCurrent((step) => Math.min(step + 1, steps.length));
      if (event.key === "ArrowLeft") setCurrent((step) => Math.max(step - 1, 0));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [steps.length]);

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Content className={styles.cook} aria-describedby={undefined}>
          <header className={styles.top}>
            <div className={styles.titleBlock}>
              <p className={`hand ${styles.kicker}`}>Cooking</p>
              <Dialog.Title className={styles.title}>{recipe.title}</Dialog.Title>
            </div>
            <p className={styles.awake} aria-live="polite">
              {wakeLock === "on" && (
                <>
                  <Sun aria-hidden="true" />
                  Screen will stay on
                </>
              )}
              {wakeLock === "off" && "Tip: turn off auto-lock while you cook"}
            </p>
            <Dialog.Close className={`btn btn-secondary ${styles.close}`}>
              <X aria-hidden="true" />
              Done cooking
            </Dialog.Close>
          </header>

          <div className={styles.columns}>
            <section className={styles.ingredients} aria-label="Ingredients">
              <RecipeBody recipe={recipe} cooking only="ingredients" />
            </section>

            <section className={styles.steps} aria-labelledby="cook-steps">
              <h2 id="cook-steps" className={styles.stepsHeading}>
                {steps.length ? (done ? "All done!" : `Step ${current + 1} of ${steps.length}`) : "Method"}
              </h2>

              {steps.length === 0 ? (
                <RecipeBody recipe={recipe} cooking only={["instructions", "other"]} />
              ) : done ? (
                <div className={styles.finished}>
                  <Check aria-hidden="true" />
                  <p>Enjoy it. If you made it, tap “I made this” on the recipe page.</p>
                </div>
              ) : (
                <p className={styles.current} aria-live="polite">
                  {steps[current]}
                </p>
              )}

              {steps.length > 0 && (
                <div className={styles.nav}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCurrent((step) => Math.max(step - 1, 0))}
                    disabled={current === 0}
                  >
                    <ArrowLeft aria-hidden="true" />
                    Back
                  </button>
                  {done ? (
                    <Dialog.Close className="btn btn-primary">Close</Dialog.Close>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setCurrent((step) => step + 1)}
                    >
                      {current === last ? "Finish" : "Next step"}
                      <ArrowRight aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}

              {steps.length > 1 && (
                <ol className={styles.all} aria-label="All steps">
                  {steps.map((step, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        className={`${styles.jump} ${index === current ? styles.here : ""} ${index < current ? styles.past : ""}`}
                        aria-current={index === current ? "step" : undefined}
                        onClick={() => setCurrent(index)}
                      >
                        <span className={styles.jumpNumber}>{index + 1}</span>
                        <span className={styles.jumpText}>{step}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
