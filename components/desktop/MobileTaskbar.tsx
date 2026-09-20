import { useEffect, useRef, useState, type KeyboardEvent } from "react";
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
  onToggle,
  onApplications,
}: {
  apps: App[];
  onOpen: (id: string) => void;
  /** Uses the desktop manager for the same minimize/restore behavior as the top panel. */
  onToggle?: (id: string) => void;
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

  const handleNavigation = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-app-id]"));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0 || buttons.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    const next = event.key === "Home" ? 0
      : event.key === "End" ? buttons.length - 1
      : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus({ preventScroll: true });
    buttons[next].scrollIntoView?.({ block: "nearest", inline: "nearest" });
  };

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
      <div className={styles.running} aria-label="Running applications" onKeyDown={handleNavigation}>
        {apps.length ? (
          apps.map((app) => (
            <button
              key={app.id}
              type="button"
              data-app-id={app.id}
              ref={app.id === activeId ? active : undefined}
              aria-label={`${app.isMinimized ? 'Restore' : app.id === activeId && onToggle ? 'Minimize' : 'Switch to'} ${app.title}`}
              aria-pressed={app.id === activeId}
              data-window-state={app.isMinimized ? 'minimized' : app.id === activeId ? 'focused' : 'running'}
              onClick={(event) => {
                event.stopPropagation();
                (onToggle ?? onOpen)(app.id);
              }}
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
