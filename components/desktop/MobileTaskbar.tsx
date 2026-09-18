import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { isCompactWindowViewport } from "../../utils/compactWindow";
import styles from "./MobileTaskbar.module.css";

type App = {
  id: string;
  title: string;
  icon?: string;
  isFocused?: boolean;
  isMinimized?: boolean;
};
/** Presentation only: the desktop manager remains the owner of app/window state. */
export default function MobileTaskbar({
  apps,
  onOpen,
  onApplications,
}: {
  apps: App[];
  onOpen: (id: string) => void;
  onApplications: () => void;
}) {
  const [compact, setCompact] = useState(false);
  const [bottom, setBottom] = useState(0);
  const active = useRef<HTMLButtonElement>(null);
  const activeId = apps.find((app) => app.isFocused && !app.isMinimized)?.id;
  useEffect(() => {
    const update = () => {
      setCompact(
        isCompactWindowViewport(
          window.innerWidth,
          window.innerHeight,
          window.matchMedia("(any-pointer: coarse)").matches,
        ),
      );
      const v = window.visualViewport;
      setBottom(
        v ? Math.max(0, window.innerHeight - v.height - v.offsetTop) : 0,
      );
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);
  useEffect(() => {
    active.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeId, compact]);
  if (!compact) return null;
  return (
    <nav className={styles.bar} style={{ bottom }} aria-label="Phone taskbar">
      <button
        className={styles.launcher}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onApplications();
        }}
        aria-label="Browse applications"
      >
        <span aria-hidden="true">▦</span>
        <span>Apps</span>
      </button>
      <div className={styles.running} aria-label="Running applications">
        {apps.length ? (
          apps.map((app) => (
            <button
              key={app.id}
              type="button"
              ref={app.id === activeId ? active : undefined}
              aria-label={`Switch to ${app.title}`}
              aria-pressed={app.id === activeId}
              onClick={() => onOpen(app.id)}
            >
              {app.icon && (
                <Image src={app.icon} width={20} height={20} alt="" />
              )}
              <span>{app.title}</span>
            </button>
          ))
        ) : (
          <span className={styles.empty}>Open an app to get started</span>
        )}
      </div>
    </nav>
  );
}
