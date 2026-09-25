import { Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";
import { TEXT_SCALES, useTextScale, useThemePreference, type ThemePreference } from "../hooks/usePreferences";
import styles from "./DisplaySettings.module.css";

const THEMES: Array<{ value: ThemePreference; label: string; Icon: typeof Sun }> = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "Auto", Icon: Monitor },
];

/** Theme and reader text size, used in the header popover and mobile menu. */
export function DisplaySettings() {
  const [theme, setTheme] = useThemePreference();
  const [scale, setScale] = useTextScale();
  const name = useId();
  const index = Math.max(0, TEXT_SCALES.indexOf(scale));

  return (
    <div className={styles.settings}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>Theme</legend>
        <div className={styles.segmented}>
          {THEMES.map(({ value, label, Icon }) => (
            <label key={value} className={styles.segment}>
              <input
                type="radio"
                name={name}
                value={value}
                checked={theme === value}
                onChange={() => setTheme(value)}
                className="visually-hidden"
              />
              <Icon aria-hidden="true" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.group} role="group" aria-labelledby={`${name}-size`}>
        <span id={`${name}-size`} className={styles.legend}>
          Text size
        </span>
        <div className={styles.stepper}>
          <button
            type="button"
            className={styles.step}
            onClick={() => setScale(TEXT_SCALES[index - 1])}
            disabled={index === 0}
            aria-label="Smaller text"
          >
            <span aria-hidden="true" className={styles.small}>
              A
            </span>
          </button>
          <output className={styles.value} aria-live="polite">
            {Math.round(scale * 100)}%
          </output>
          <button
            type="button"
            className={styles.step}
            onClick={() => setScale(TEXT_SCALES[index + 1])}
            disabled={index === TEXT_SCALES.length - 1}
            aria-label="Larger text"
          >
            <span aria-hidden="true" className={styles.large}>
              A
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
