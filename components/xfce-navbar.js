import React from "react";

/**
 * XFCE style workspace navigation bar.
 *
 * The workspace list is hidden on very small viewports and collapses to dots
 * on small screens for compactness. Numbers are displayed on medium and larger
 * screens. Each workspace is rendered as a button to ensure keyboard
 * accessibility on both desktop and mobile.
 */
export default function XfceNavbar({ workspaces = 4, current = 1, onSelect }) {
  const items = Array.from({ length: workspaces }, (_, i) => i + 1);
  return (
    <nav
      className="hidden sm:flex gap-2 items-center"
      aria-label="Workspace switcher"
    >
      {items.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onSelect?.(n)}
          aria-label={`Workspace ${n}`}
          aria-current={current === n ? "page" : undefined}
          className="px-2 py-1 rounded focus:outline-none focus:ring"
        >
          <span className="hidden md:inline">{n}</span>
          <span className="md:hidden" aria-hidden="true">
            &bull;
          </span>
        </button>
      ))}
    </nav>
  );
}
