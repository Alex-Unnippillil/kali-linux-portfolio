'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

export type SnapRegionId =
  | 'half-left'
  | 'half-right'
  | 'third-left'
  | 'third-middle'
  | 'third-right'
  | 'grid-top-left'
  | 'grid-top-right'
  | 'grid-bottom-left'
  | 'grid-bottom-right';

type LayoutRegion = {
  id: SnapRegionId;
  label: string;
  hint: string;
  className: string;
};

type LayoutPreset = {
  id: string;
  label: string;
  hint: string;
  gridClass: string;
  regions: LayoutRegion[];
};

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'halves',
    label: 'Halves',
    hint: '1',
    gridClass: 'grid grid-cols-2 gap-1 h-24',
    regions: [
      {
        id: 'half-left',
        label: 'Snap to left half',
        hint: 'Q',
        className: 'col-start-1 row-start-1',
      },
      {
        id: 'half-right',
        label: 'Snap to right half',
        hint: 'W',
        className: 'col-start-2 row-start-1',
      },
    ],
  },
  {
    id: 'thirds',
    label: 'Thirds',
    hint: '2',
    gridClass: 'grid grid-cols-3 gap-1 h-24',
    regions: [
      {
        id: 'third-left',
        label: 'Snap to left third',
        hint: 'A',
        className: 'col-start-1 row-start-1',
      },
      {
        id: 'third-middle',
        label: 'Snap to middle third',
        hint: 'S',
        className: 'col-start-2 row-start-1',
      },
      {
        id: 'third-right',
        label: 'Snap to right third',
        hint: 'D',
        className: 'col-start-3 row-start-1',
      },
    ],
  },
  {
    id: 'grid',
    label: 'Grid 2×2',
    hint: '3',
    gridClass: 'grid grid-cols-2 grid-rows-2 gap-1 h-24',
    regions: [
      {
        id: 'grid-top-left',
        label: 'Snap to top left quadrant',
        hint: 'Z',
        className: 'col-start-1 row-start-1',
      },
      {
        id: 'grid-top-right',
        label: 'Snap to top right quadrant',
        hint: 'X',
        className: 'col-start-2 row-start-1',
      },
      {
        id: 'grid-bottom-left',
        label: 'Snap to bottom left quadrant',
        hint: 'C',
        className: 'col-start-1 row-start-2',
      },
      {
        id: 'grid-bottom-right',
        label: 'Snap to bottom right quadrant',
        hint: 'V',
        className: 'col-start-2 row-start-2',
      },
    ],
  },
];

export interface SnapOverlayProps {
  anchor?: DOMRect | { top: number; left: number; width: number; height: number } | null;
  visible?: boolean;
  onClose?: () => void;
  snapActiveWindow?: (region: SnapRegionId) => void;
  autoFocusFirst?: boolean;
}

const SnapOverlay: React.FC<SnapOverlayProps> = ({
  anchor,
  visible = true,
  onClose,
  snapActiveWindow,
  autoFocusFirst = true,
}) => {
  const firstRegionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    if (autoFocusFirst && firstRegionRef.current) {
      firstRegionRef.current.focus();
    }
  }, [visible, autoFocusFirst]);

  useEffect(() => {
    if (!visible) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onClose]);

  const positionStyle = useMemo(() => {
    if (!anchor) {
      return { top: '1.5rem', right: '1.5rem' } as const;
    }
    const { top, left, width } = anchor;
    const computedTop = top;
    const computedLeft = left + width + 12;
    return { top: `${Math.max(computedTop, 12)}px`, left: `${computedLeft}px` } as const;
  }, [anchor]);

  const applySnap = useCallback(
    (region: SnapRegionId) => {
      if (typeof snapActiveWindow === 'function') {
        snapActiveWindow(region);
      } else if (typeof window !== 'undefined') {
        const target = document.querySelector<HTMLElement>('.opened-window.z-30:not(.closed-window)');
        if (target) {
          const detail: { region: SnapRegionId; windowId?: string } = {
            region,
            windowId: target.id || undefined,
          };
          const eventInit: CustomEventInit<typeof detail> = { detail };
          target.dispatchEvent(new CustomEvent('snap-region', eventInit));
          window.dispatchEvent(new CustomEvent('desktop:snap-region', eventInit));
        }
      }
      onClose?.();
    },
    [snapActiveWindow, onClose]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, region: SnapRegionId) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        applySnap(region);
      }
    },
    [applySnap]
  );

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fixed z-50"
      style={positionStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Snap layout options"
      data-testid="snap-overlay"
    >
      <div className="w-72 space-y-3 rounded-lg bg-black/80 p-3 text-white shadow-2xl backdrop-blur">
        {LAYOUT_PRESETS.map((preset, presetIndex) => (
          <div key={preset.id} className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-200">
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {preset.hint}
              </kbd>
              <span>{preset.label}</span>
            </div>
            <div className={preset.gridClass} role="grid">
              {preset.regions.map((region, regionIndex) => (
                <button
                  key={region.id}
                  type="button"
                  ref={presetIndex === 0 && regionIndex === 0 ? firstRegionRef : undefined}
                  className={
                    'relative flex items-center justify-center rounded border border-white/15 bg-white/10 text-xs text-white/70 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ' +
                    region.className
                  }
                  aria-label={region.label}
                  data-region={region.id}
                  onClick={() => applySnap(region.id)}
                  onKeyDown={(event) => handleKeyDown(event, region.id)}
                >
                  <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/50 px-1 text-[10px] font-semibold uppercase tracking-widest text-gray-100">
                    {region.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SnapOverlay;
