'use client';

import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { useCallback, useMemo, useSyncExternalStore } from 'react';

import type { DesktopWindow } from './wm-store';
import { getServerSnapshot, getSnapshot, subscribe, wm } from './wm-store';

export interface WindowProps {
  id: string;
  className?: string;
  children?: ReactNode;
}

function getWindowStyle(win: DesktopWindow): CSSProperties | undefined {
  const { bounds, zIndex } = win;

  if (!bounds && typeof zIndex !== 'number') {
    return undefined;
  }

  const style: CSSProperties = { position: 'absolute' };

  if (bounds) {
    style.top = bounds.y;
    style.left = bounds.x;
    style.width = bounds.width;
    style.height = bounds.height;
  }

  if (typeof zIndex === 'number') {
    style.zIndex = zIndex;
  }

  return style;
}

function stopPointerDown(event: ReactPointerEvent<HTMLElement>): void {
  event.stopPropagation();
}

export default function Window({ id, className, children }: WindowProps) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const win = state.windows[id];
  const isActiveWorkspace =
    win && state.activeWorkspaceId && win.workspaceId === state.activeWorkspaceId;

  const shouldRender = Boolean(win && isActiveWorkspace && !win.minimized);
  const style = useMemo(() => (win ? getWindowStyle(win) : undefined), [win]);
  const titleId = `desktop-window-${id}-title`;

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      event.stopPropagation();
      if (event.button !== 0) return;
      wm.focus(id);
    },
    [id],
  );

  const handleMinimize = useCallback(() => {
    wm.minimize(id);
  }, [id]);

  const handleClose = useCallback(() => {
    wm.close(id);
  }, [id]);

  if (!shouldRender || !win) {
    return null;
  }

  const title = win.title ?? 'Untitled';

  const composedClassName = [
    'absolute flex min-h-[12rem] min-w-[16rem] select-none flex-col overflow-hidden rounded-lg bg-ub-grey shadow-lg',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      role="dialog"
      aria-labelledby={titleId}
      data-window-id={id}
      className={composedClassName}
      style={style}
      onPointerDown={handlePointerDown}
    >
      <header className="flex items-center justify-between gap-2 bg-black/30 px-3 py-2 text-sm font-semibold text-white">
        <span id={titleId} className="truncate" title={title}>
          {title}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Minimize window"
            className="h-6 w-6 rounded-full bg-ub-grey text-xs text-white transition hover:bg-ub-warm-grey focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ub-orange"
            onPointerDown={stopPointerDown}
            onClick={handleMinimize}
          >
            _
          </button>
          <button
            type="button"
            aria-label="Close window"
            className="h-6 w-6 rounded-full bg-red-600 text-xs text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-400"
            onPointerDown={stopPointerDown}
            onClick={handleClose}
          >
            ×
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-ub-cool-grey text-white">
        {children}
      </div>
    </section>
  );
}
