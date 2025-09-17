"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  CSSProperties,
  FC,
  PointerEvent as ReactPointerEvent,
} from 'react';
import {
  SOFT_KEYBOARD_FRAME_EVENT,
  SOFT_KEYBOARD_HIDE_EVENT,
  SOFT_KEYBOARD_PRESS_EVENT,
  type SoftKeyboardMode,
  type SoftKeyboardPressDetail,
  type SoftKeyboardFrameDetail,
} from '@/src/wm/placement';

const DEFAULT_FLOATING_POSITION = { x: 24, y: 24 } as const;
const KEY_MARGIN = 16;

type SoftKey = {
  label: string;
  value: string;
  ariaLabel?: string;
  flex?: number;
};

const KEY_ROWS: SoftKey[][] = [
  [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: '0', value: '0' },
    { label: '⌫', value: 'Backspace', ariaLabel: 'Backspace', flex: 1.5 },
  ],
  [
    { label: 'Q', value: 'q' },
    { label: 'W', value: 'w' },
    { label: 'E', value: 'e' },
    { label: 'R', value: 'r' },
    { label: 'T', value: 't' },
    { label: 'Y', value: 'y' },
    { label: 'U', value: 'u' },
    { label: 'I', value: 'i' },
    { label: 'O', value: 'o' },
    { label: 'P', value: 'p' },
  ],
  [
    { label: 'A', value: 'a' },
    { label: 'S', value: 's' },
    { label: 'D', value: 'd' },
    { label: 'F', value: 'f' },
    { label: 'G', value: 'g' },
    { label: 'H', value: 'h' },
    { label: 'J', value: 'j' },
    { label: 'K', value: 'k' },
    { label: 'L', value: 'l' },
    { label: '⏎', value: 'Enter', ariaLabel: 'Enter', flex: 1.5 },
  ],
  [
    { label: 'Z', value: 'z' },
    { label: 'X', value: 'x' },
    { label: 'C', value: 'c' },
    { label: 'V', value: 'v' },
    { label: 'B', value: 'b' },
    { label: 'N', value: 'n' },
    { label: 'M', value: 'm' },
    { label: ',', value: ',' },
    { label: '.', value: '.' },
    { label: '?', value: '?' },
  ],
  [
    { label: 'Space', value: ' ', ariaLabel: 'Space', flex: 4 },
  ],
];

export interface SoftKeyboardProps {
  /**
   * Controls whether the keyboard is rendered.
   */
  visible?: boolean;
  /**
   * Called when the user asks to hide the keyboard.
   */
  onClose?: () => void;
  /**
   * Receives key presses emitted by the on-screen keyboard.
   */
  onKeyPress?: (key: string) => void;
  /**
   * Initial display mode. The component remains uncontrolled after mount unless
   * consumers manually call {@link setMode} on the imperative handle.
   */
  initialMode?: SoftKeyboardMode;
  /**
   * Called whenever the keyboard mode changes.
   */
  onModeChange?: (mode: SoftKeyboardMode) => void;
  /**
   * Starting point for the floating keyboard. Values are in viewport pixels.
   */
  initialFloatingPosition?: { x: number; y: number };
  /**
   * Optional CSS class names to append to the container.
   */
  className?: string;
}

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const SoftKeyboard: FC<SoftKeyboardProps> = ({
  visible = true,
  onClose,
  onKeyPress,
  initialMode = 'docked',
  onModeChange,
  initialFloatingPosition,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [mode, setMode] = useState<SoftKeyboardMode>(initialMode);
  const [floatingPosition, setFloatingPosition] = useState(() => ({
    x: initialFloatingPosition?.x ?? DEFAULT_FLOATING_POSITION.x,
    y: initialFloatingPosition?.y ?? DEFAULT_FLOATING_POSITION.y,
  }));
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    setMode((prev) => (prev === initialMode ? prev : initialMode));
  }, [initialMode]);

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  const updateFloatingPosition = useCallback((x: number, y: number) => {
    setFloatingPosition((prev) => {
      const node = containerRef.current;
      if (!node || typeof window === 'undefined') {
        if (Math.abs(prev.x - x) < 0.5 && Math.abs(prev.y - y) < 0.5) {
          return prev;
        }
        return { x, y };
      }

      const rect = node.getBoundingClientRect();
      const availableX = Math.max(0, window.innerWidth - rect.width);
      const availableY = Math.max(0, window.innerHeight - rect.height);
      const minX = Math.min(KEY_MARGIN, availableX);
      const minY = Math.min(KEY_MARGIN, availableY);
      const maxX = Math.max(minX, availableX - KEY_MARGIN);
      const maxY = Math.max(minY, availableY - KEY_MARGIN);
      const nextX = clamp(x, minX, maxX);
      const nextY = clamp(y, minY, maxY);

      if (Math.abs(prev.x - nextX) < 0.5 && Math.abs(prev.y - nextY) < 0.5) {
        return prev;
      }

      return { x: nextX, y: nextY };
    });
  }, []);

  const emitKey = useCallback(
    (key: string) => {
      onKeyPress?.(key);
      if (typeof window === 'undefined') return;
      const detail: SoftKeyboardPressDetail = { key };
      window.dispatchEvent(
        new CustomEvent<SoftKeyboardPressDetail>(SOFT_KEYBOARD_PRESS_EVENT, {
          detail,
        })
      );
    },
    [onKeyPress]
  );

  const announceFrame = useCallback(() => {
    if (!visible || typeof window === 'undefined') return;
    const node = containerRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const detail: SoftKeyboardFrameDetail = {
      mode,
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      },
    };

    window.dispatchEvent(
      new CustomEvent<SoftKeyboardFrameDetail>(SOFT_KEYBOARD_FRAME_EVENT, {
        detail,
      })
    );
  }, [mode, visible]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!visible) {
      window.dispatchEvent(new CustomEvent(SOFT_KEYBOARD_HIDE_EVENT));
      return;
    }

    announceFrame();
    const handleResize = () => announceFrame();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.dispatchEvent(new CustomEvent(SOFT_KEYBOARD_HIDE_EVENT));
    };
  }, [announceFrame, visible]);

  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => announceFrame());
    return () => cancelAnimationFrame(id);
  }, [announceFrame, floatingPosition.x, floatingPosition.y, mode, visible]);

  useEffect(() => {
    if (mode === 'floating') {
      updateFloatingPosition(floatingPosition.x, floatingPosition.y);
    }
  }, [mode, floatingPosition.x, floatingPosition.y, updateFloatingPosition]);

  useEffect(() => {
    if (!isDragging) return;
    if (typeof window === 'undefined') return;

    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      updateFloatingPosition(
        event.clientX - drag.offsetX,
        event.clientY - drag.offsetY
      );
    };

    const endDrag = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      dragStateRef.current = null;
      const node = containerRef.current;
      if (node && node.hasPointerCapture?.(event.pointerId)) {
        node.releasePointerCapture(event.pointerId);
      }
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    };
  }, [isDragging, updateFloatingPosition]);

  useEffect(() => {
    if (mode === 'docked' && isDragging) {
      setIsDragging(false);
      dragStateRef.current = null;
    }
  }, [isDragging, mode]);

  useEffect(() => () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SOFT_KEYBOARD_HIDE_EVENT));
    }
  }, []);

  const handleHeaderPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (mode !== 'floating') return;
      if (event.button !== 0) return;
      const target = event.target as HTMLElement;
      if (target.closest('button')) return;
      const node = containerRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      dragStateRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      node.setPointerCapture?.(event.pointerId);
      setIsDragging(true);
      event.preventDefault();
    },
    [mode]
  );

  const containerClassName = useMemo(() => {
    const base = [
      'fixed z-[999] pointer-events-auto text-sm text-zinc-100',
      'bg-zinc-900/95 backdrop-blur border border-zinc-700/60 shadow-2xl',
      'rounded-t-2xl sm:rounded-2xl transition-transform duration-200 ease-out',
    ];

    if (mode === 'docked') {
      base.push('left-1/2 bottom-0 sm:bottom-4 w-full sm:w-[720px]');
      base.push('-translate-x-1/2');
    } else {
      base.push('w-[min(100vw-1.5rem,720px)]');
    }

    if (className) {
      base.push(className);
    }

    return base.join(' ');
  }, [className, mode]);

  const containerStyle = useMemo<CSSProperties>(() => {
    if (mode === 'docked') {
      return { transform: 'translateX(-50%)' };
    }
    return {
      left: floatingPosition.x,
      top: floatingPosition.y,
    };
  }, [floatingPosition.x, floatingPosition.y, mode]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      style={containerStyle}
      data-mode={mode}
      aria-label="On-screen keyboard"
      role="group"
    >
      <div
        className={`flex items-center justify-between gap-3 px-3 py-2 border-b border-zinc-700/60 text-xs uppercase tracking-wide select-none ${
          mode === 'floating' ? 'cursor-grab active:cursor-grabbing touch-none' : ''
        }`}
        onPointerDown={handleHeaderPointerDown}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-200">Keyboard</span>
          <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
            {mode === 'docked' ? 'Docked' : 'Floating'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-zinc-700/80">
            <button
              type="button"
              className={`px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                mode === 'docked'
                  ? 'bg-sky-500/20 text-sky-200'
                  : 'bg-transparent text-zinc-300 hover:bg-zinc-800/80'
              }`}
              onClick={() => setMode('docked')}
              aria-pressed={mode === 'docked'}
            >
              Docked
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                mode === 'floating'
                  ? 'bg-sky-500/20 text-sky-200'
                  : 'bg-transparent text-zinc-300 hover:bg-zinc-800/80'
              }`}
              onClick={() => setMode('floating')}
              aria-pressed={mode === 'floating'}
            >
              Floating
            </button>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-transparent bg-zinc-800/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-300 transition-colors hover:bg-zinc-700/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              Hide
            </button>
          ) : null}
        </div>
      </div>
      <div className="space-y-2 p-3">
        {KEY_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="flex gap-2">
            {row.map((key) => (
              <button
                key={`${rowIndex}-${key.label}-${key.value}`}
                type="button"
                className="flex min-h-[42px] select-none items-center justify-center rounded-lg bg-zinc-800/80 px-3 text-base font-semibold uppercase tracking-wide text-zinc-100 shadow-inner transition-colors hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                style={{
                  flexGrow: key.flex ?? 1,
                  flexShrink: 1,
                  flexBasis: 0,
                }}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => emitKey(key.value)}
                aria-label={key.ariaLabel ?? key.label}
                data-key={key.value}
              >
                {key.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SoftKeyboard;
