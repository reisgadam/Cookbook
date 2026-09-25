import { Info } from "lucide-react";
import { useId, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Link } from "react-router";
import remarkGfm from "remark-gfm";
import { useStoredState } from "../../hooks/useStoredState";
import type { Recipe, RecipeSection, SectionKind } from "../../types/recipe";
import styles from "./RecipeBody.module.css";

type Checks = Record<string, boolean>;

interface Props {
  recipe: Recipe;
  /** Larger type for cook mode. */
  cooking?: boolean;
  /** Show only these kinds of section. */
  only?: SectionKind | SectionKind[];
}

/**
 * The transcribed recipe. Ingredients and steps can be ticked off while
 * cooking (remembered on this device), and transcriber's notes are set
 * apart from her own words.
 */
export function RecipeBody({ recipe, cooking = false, only }: Props) {
  const [checks, setChecks] = useStoredState<Checks>(`checks:${recipe.slug}`, {});
  const kinds = only ? ([] as SectionKind[]).concat(only) : undefined;
  const prefix = useId();
  const checkedCount = Object.values(checks).filter(Boolean).length;
  const toggle = (id: string) => setChecks((current) => ({ ...current, [id]: !current[id] }));

  return (
    <div className={`${styles.body} ${cooking ? styles.cooking : ""}`}>
      {recipe.sections.map((section, index) =>
        kinds && !kinds.includes(section.kind) ? null : (
          <Section
            key={`${section.heading}-${index}`}
            section={section}
            id={`${prefix}section-${index}`}
            checks={checks}
            onToggle={toggle}
          />
        ),
      )}
      {checkedCount > 0 && (
        <p className={styles.reset} data-print="hide">
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setChecks({})}>
            Clear {checkedCount} checkmark{checkedCount === 1 ? "" : "s"}
          </button>
        </p>
      )}
    </div>
  );
}

function Section({
  section,
  id,
  checks,
  onToggle,
}: {
  section: RecipeSection;
  id: string;
  checks: Checks;
  onToggle: (id: string) => void;
}) {
  const checkable = section.kind === "ingredients" || section.kind === "instructions";
  const headingId = `${id}-heading`;
  const keyFor = (line?: number) => `${section.kind}:${section.heading}:${line ?? 0}`;

  const components: Components = {
    // A paragraph that's only bold text ("**Crust**") is a sub-heading.
    p({ node, children }) {
      const only = node?.children.length === 1 ? node.children[0] : undefined;
      if (only && only.type === "element" && only.tagName === "strong") {
        return <h3 className={styles.subhead}>{children}</h3>;
      }
      return <p>{children}</p>;
    },
    h3: ({ children }) => <h3 className={styles.subhead}>{children}</h3>,
    // Links to other recipes ("/recipes/pie-meringue") go through the router,
    // which adds the site's base path.
    a: ({ href = "", children }) =>
      href.startsWith("/") ? (
        <Link to={href}>{children}</Link>
      ) : (
        <a href={href} target="_blank" rel="noreferrer">
          {children}
        </a>
      ),
    blockquote: ({ children }) => <TranscriberNote>{children}</TranscriberNote>,
    table: ({ children }) => (
      <div className={styles.tableWrap}>
        <table>{children}</table>
      </div>
    ),
    li({ node, children }) {
      if (!checkable) return <li>{children}</li>;
      const line = node?.position?.start.line ?? 0;
      const key = keyFor(line);
      const inputId = `${id}-line-${line}`;
      const done = Boolean(checks[key]);
      return (
        <li className={`${styles.item} ${done ? styles.done : ""}`}>
          <input
            id={inputId}
            type="checkbox"
            className={styles.check}
            checked={done}
            onChange={() => onToggle(key)}
          />
          <span className={styles.number} aria-hidden="true" />
          <label htmlFor={inputId} className={styles.itemText}>
            {children}
          </label>
        </li>
      );
    },
  };

  return (
    <section
      className={`${styles.section} ${styles[section.kind]}`}
      aria-labelledby={section.heading ? headingId : undefined}
    >
      {section.heading && (
        <h2 id={headingId} className={styles.heading}>
          {section.heading}
        </h2>
      )}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {section.markdown}
      </ReactMarkdown>
    </section>
  );
}

function TranscriberNote({ children }: { children: ReactNode }) {
  return (
    <aside className={styles.note} aria-label="Transcriber's note">
      <p className={styles.noteLabel}>
        <Info aria-hidden="true" />
        Transcriber’s note
      </p>
      <div className={styles.noteText}>{children}</div>
    </aside>
  );
}
