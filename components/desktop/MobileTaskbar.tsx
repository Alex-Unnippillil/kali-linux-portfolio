import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import ShowDesktopButton from "../panel/ShowDesktopButton";
import { getViewportPolicy, subscribeViewportPolicy } from "../../utils/compactWindow";
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
      const policy = getViewportPolicy();
      setCompact(policy.presentation.compact);
      setBottom(policy.workingArea.obstruction.bottom);
    };
    update();
    return subscribeViewportPolicy(update);
  }, []);
  useEffect(() => {
    active.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [activeId, compact]);
  if (!compact) return null;
  return (
    <nav className={styles.bar} style={{ bottom }} aria-label="Phone taskbar"
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const index = buttons.indexOf(event.target as HTMLButtonElement);
        if (index < 0) return;
        event.preventDefault(); event.stopPropagation();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[next].focus();
        buttons[next].scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
      }}
    >
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
      <ShowDesktopButton />
      <div className={styles.running} aria-label="Running applications">
        {apps.length ? (
          apps.map((app) => (
            <button
              key={app.id}
              data-app-id={app.id}
              type="button"
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
