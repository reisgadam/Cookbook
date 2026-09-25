import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./BackToTop.module.css";

/** A small round button that appears once you're a couple of screens down. */
export function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      setShown(window.scrollY > window.innerHeight * 1.5);
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const toTop = () => {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    // Keyboard users carry on from the top of the page, too.
    document.getElementById("main")?.focus({ preventScroll: true });
  };

  return (
    <button type="button" className={styles.button} data-shown={shown} data-print="hide" onClick={toTop}>
      <ArrowUp aria-hidden="true" />
      <span className="visually-hidden">Back to top</span>
    </button>
  );
}
