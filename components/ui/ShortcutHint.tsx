"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ShortcutHintPayload {
  action: string;
  description: string;
  keys: string;
  target: HTMLElement | null;
}

interface Position {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

interface ShortcutHintProps {
  hint: ShortcutHintPayload | null;
  visible: boolean;
}

const OFFSET = 12;

const computePosition = (element: HTMLElement): Position => {
  const rect = element.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;

  let placement: Position['placement'] = 'top';
  let top = rect.top + scrollY - OFFSET;
  if (rect.top < 72) {
    placement = 'bottom';
    top = rect.bottom + scrollY + OFFSET;
  } else if (rect.bottom > viewportHeight - 72) {
    placement = 'top';
    top = rect.top + scrollY - OFFSET;
  }

  let left = rect.left + scrollX + rect.width / 2;
  const margin = 16;
  left = Math.min(Math.max(left, margin), viewportWidth - margin);

  return { placement, top, left };
};

const useHintPosition = (
  target: HTMLElement | null,
  visible: boolean,
): Position | null => {
  const [position, setPosition] = useState<Position | null>(null);

  useLayoutEffect(() => {
    if (!target) {
      setPosition(null);
      return;
    }
    const update = () => setPosition(computePosition(target));
    update();
    const handle = () => update();
    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update);
      observer.observe(target);
    }
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
      observer?.disconnect();
    };
  }, [target, visible]);

  return position;
};

const ShortcutHint = ({ hint, visible }: ShortcutHintProps) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const position = useHintPosition(hint?.target ?? null, visible && Boolean(hint));

  const style = useMemo(() => {
    if (!position) return undefined;
    const transform =
      position.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)';
    return {
      top: position.top,
      left: position.left,
      transform,
      transitionDuration: 'var(--motion-medium)',
    } as const;
  }, [position]);

  if (!mounted || !hint || !style || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed z-[70] max-w-xs transition-opacity ease-out ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={style}
      data-placement={position?.placement}
    >
      <div
        className="relative rounded-md border border-black/40 bg-ub-grey/95 px-3 py-2 text-left text-xs text-white shadow-lg"
      >
        <div className="font-semibold tracking-wide text-ubt-grey">{hint.keys}</div>
        <p className="mt-1 text-[11px] text-ubt-grey">
          Try the keyboard shortcut to {hint.description.toLowerCase()}.
        </p>
        <span
          className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border border-black/40 bg-ub-grey/95 ${
            position?.placement === 'top'
              ? 'bottom-[-5px] border-t-0 border-l-0'
              : 'top-[-5px] border-b-0 border-r-0'
          }`}
          aria-hidden="true"
        />
      </div>
    </div>,
    document.body,
  );
};

export default ShortcutHint;
