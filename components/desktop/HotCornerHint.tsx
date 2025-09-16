"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HotCornerId,
  registerHotCorner,
  triggerHotCorner,
} from '../../src/desktop/hotCorners';

export interface HotCornerHintProps {
  corner: HotCornerId;
  label: string;
  onActivate: () => void;
  dwellMs?: number;
}

const CORNER_POSITIONS: Record<HotCornerId, string> = {
  'top-left': 'top-0 left-0',
  'top-right': 'top-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'bottom-right': 'bottom-0 right-0',
};

const TOOLTIP_POSITIONS: Record<HotCornerId, string> = {
  'top-left': 'left-full top-1/2 -translate-y-1/2 ml-3 origin-left',
  'top-right': 'right-full top-1/2 -translate-y-1/2 mr-3 origin-right',
  'bottom-left': 'left-full bottom-1/2 translate-y-1/2 ml-3 origin-left',
  'bottom-right': 'right-full bottom-1/2 translate-y-1/2 mr-3 origin-right',
};

const DEFAULT_DWELL = 250;

const HotCornerHint: React.FC<HotCornerHintProps> = ({
  corner,
  label,
  onActivate,
  dwellMs = DEFAULT_DWELL,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return registerHotCorner({ corner, action: onActivate, dwellMs });
  }, [corner, onActivate, dwellMs]);

  const tooltipClass = useMemo(() => {
    return TOOLTIP_POSITIONS[corner];
  }, [corner]);

  const handleActivate = useCallback(
    (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      event.preventDefault();
      triggerHotCorner(corner);
    },
    [corner]
  );

  return (
    <div
      className={`pointer-events-none absolute z-50 ${CORNER_POSITIONS[corner]} p-4`}
      data-hot-corner={corner}
    >
      <button
        type="button"
        aria-label={label}
        className={`pointer-events-auto relative flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-black/40 text-xs text-white opacity-0 outline-none transition-opacity duration-200 ease-out hover:opacity-100 focus-visible:opacity-100 ${visible ? 'opacity-100' : ''}`}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        onClick={handleActivate}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs font-medium tracking-wide text-white shadow-lg transition-all duration-150 ${tooltipClass} ${visible ? 'opacity-100' : 'opacity-0 translate-y-1'}`}
        >
          {label}
        </span>
        <span
          aria-hidden="true"
          className="h-4 w-4 rounded-full border border-white/40 bg-white/90 shadow-[0_0_12px_rgba(255,255,255,0.5)]"
        />
      </button>
    </div>
  );
};

export default HotCornerHint;
