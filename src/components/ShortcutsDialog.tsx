import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Fragment } from "react";
import styles from "./ShortcutsDialog.module.css";

const mod = /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘" : "Ctrl";

interface Shortcut {
  /** Each entry is one way to do it; each way is a list of keys pressed together. */
  keys: string[][];
  label: string;
}

const GROUPS: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: "Anywhere",
    shortcuts: [
      { keys: [["/"], [mod, "K"]], label: "Search the recipes" },
      { keys: [["?"]], label: "Show this list" },
    ],
  },
  {
    title: "In cook mode",
    shortcuts: [
      { keys: [["→"], ["←"]], label: "Next or previous step" },
      { keys: [["Esc"]], label: "Leave cook mode" },
    ],
  },
  {
    title: "Looking at a photo",
    shortcuts: [
      { keys: [["+"], ["−"]], label: "Zoom in or out" },
      { keys: [["→"], ["←"]], label: "Next or previous photo" },
      { keys: [["Esc"]], label: "Close the photo" },
    ],
  },
];

export default function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog} aria-describedby={undefined}>
          <div className={styles.header}>
            <Dialog.Title className={styles.title}>Keyboard shortcuts</Dialog.Title>
            <Dialog.Close className="icon-btn" aria-label="Close">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>
          {GROUPS.map((group) => (
            <section key={group.title} className={styles.group}>
              <h3 className={styles.groupTitle}>{group.title}</h3>
              <dl className={styles.list}>
                {group.shortcuts.map((shortcut) => (
                  <div key={shortcut.label} className={styles.row}>
                    <dt className={styles.keys}>
                      {shortcut.keys.map((combo, i) => (
                        <Fragment key={combo.join("+")}>
                          {i > 0 && <span className={styles.or}>or</span>}
                          <span className={styles.combo}>
                            {combo.map((key) => (
                              <kbd key={key}>{key}</kbd>
                            ))}
                          </span>
                        </Fragment>
                      ))}
                    </dt>
                    <dd>{shortcut.label}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
