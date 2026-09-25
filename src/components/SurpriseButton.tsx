import { Dices } from "lucide-react";
import { useState } from "react";
import { useSurprise } from "../hooks/useSurprise";
import type { Recipe } from "../types/recipe";
import styles from "./SurpriseButton.module.css";

interface Props {
  pool?: Recipe[];
  exclude?: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "icon";
  className?: string;
}

/** Opens a random recipe, with a little roll of the dice. */
export function SurpriseButton({ pool, exclude, label = "Surprise me", variant = "secondary", className = "" }: Props) {
  const surprise = useSurprise();
  const [rolling, setRolling] = useState(false);

  const onClick = () => {
    setRolling(true);
    window.setTimeout(() => setRolling(false), 450);
    surprise(pool, exclude);
  };

  const icon = <Dices className={`${styles.dice} ${rolling ? styles.rolling : ""}`} aria-hidden="true" />;

  if (variant === "icon") {
    return (
      <button type="button" className={`icon-btn ${className}`} onClick={onClick} aria-label={`${label}: open a random recipe`} title={label}>
        {icon}
      </button>
    );
  }

  return (
    <button type="button" className={`btn btn-${variant} ${className}`} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}
