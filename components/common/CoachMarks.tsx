'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

const DISMISS_STORAGE_KEY = 'coachmarks:dismissed';
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 24 * 30;

type TargetResolver = () => HTMLElement | null;

type CoachMarkTarget =
  | string
  | TargetResolver
  | React.RefObject<HTMLElement>;

export interface CoachMarkConfig {
  id: string;
  title?: string;
  description: string;
  target: CoachMarkTarget;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

interface StoredDismissals {
  [id: string]: number;
}

export interface CoachMarksContextValue {
  registerMark: (config: CoachMarkConfig) => void;
  unregisterMark: (id: string) => void;
  showMark: (id: string) => void;
  hideMark: () => void;
  dismissMark: (id: string) => void;
  startSequence: (ids: string[]) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  isDismissed: (id: string) => boolean;
  activeMarkId?: string;
  sequence?: {
    ids: string[];
    index: number;
  } | null;
}

const CoachMarksContext = createContext<CoachMarksContextValue | undefined>(
  undefined
);

const resolveTarget = (target: CoachMarkTarget): HTMLElement | null => {
  if (typeof target === 'string') {
    if (typeof document === 'undefined') return null;
    return document.querySelector<HTMLElement>(target);
  }
  if (typeof target === 'function') {
    return target();
  }
  return target.current ?? null;
};

const readDismissedMarks = (): StoredDismissals => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const data = JSON.parse(raw) as StoredDismissals;
    const now = Date.now();
    const valid: StoredDismissals = {};
    for (const [id, timestamp] of Object.entries(data)) {
      if (typeof timestamp === 'number' && now - timestamp < DISMISS_WINDOW_MS) {
        valid[id] = timestamp;
      }
    }
    if (Object.keys(valid).length !== Object.keys(data).length) {
      window.localStorage.setItem(
        DISMISS_STORAGE_KEY,
        JSON.stringify(valid)
      );
    }
    return valid;
  } catch (error) {
    console.warn('[CoachMarks] Failed to read dismissed marks', error);
    return {};
  }
};

const persistDismissedMarks = (dismissed: StoredDismissals) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(
    DISMISS_STORAGE_KEY,
    JSON.stringify(dismissed)
  );
};

export interface CoachMarksProviderProps {
  children: React.ReactNode;
}

export const CoachMarksProvider: React.FC<CoachMarksProviderProps> = ({
  children,
}) => {
  const [marks, setMarks] = useState<Map<string, CoachMarkConfig>>(new Map());
  const [activeMarkId, setActiveMarkId] = useState<string | undefined>();
  const [sequence, setSequence] = useState<{ ids: string[]; index: number } | null>(
    null
  );
  const [dismissed, setDismissed] = useState<StoredDismissals>(() =>
    readDismissedMarks()
  );

  useEffect(() => {
    persistDismissedMarks(dismissed);
  }, [dismissed]);

  const registerMark = useCallback((config: CoachMarkConfig) => {
    setMarks((prev) => {
      const next = new Map(prev);
      next.set(config.id, config);
      return next;
    });
  }, []);

  const unregisterMark = useCallback((id: string) => {
    setMarks((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const hideMark = useCallback(() => {
    setActiveMarkId(undefined);
    setSequence(null);
  }, []);

  const showMark = useCallback(
    (id: string) => {
      setActiveMarkId((current) => {
        if (dismissed[id]) {
          return current;
        }
        if (!marks.has(id)) {
          return current;
        }
        return id;
      });
    },
    [dismissed, marks]
  );

  const dismissMark = useCallback(
    (id: string) => {
      setDismissed((prev) => ({ ...prev, [id]: Date.now() }));
      setActiveMarkId((current) => (current === id ? undefined : current));
      setSequence((prev) => {
        if (!prev) return prev;
        const index = prev.ids.indexOf(id);
        if (index === -1) return prev;
        const remaining = prev.ids.filter((markId) => markId !== id);
        if (remaining.length === 0) {
          return null;
        }
        const newIndex = Math.min(index, remaining.length - 1);
        setActiveMarkId(remaining[newIndex]);
        return { ids: remaining, index: newIndex };
      });
    },
    []
  );

  const startSequence = useCallback(
    (ids: string[]) => {
      const available = ids.filter((id) => marks.has(id) && !dismissed[id]);
      if (available.length === 0) {
        return;
      }
      setSequence({ ids: available, index: 0 });
      setActiveMarkId(available[0]);
    },
    [dismissed, marks]
  );

  const goToNext = useCallback(() => {
    setSequence((prev) => {
      if (!prev) return prev;
      const nextIndex = prev.index + 1;
      if (nextIndex >= prev.ids.length) {
        setActiveMarkId(undefined);
        return null;
      }
      const nextId = prev.ids[nextIndex];
      setActiveMarkId(nextId);
      return { ids: prev.ids, index: nextIndex };
    });
  }, []);

  const goToPrevious = useCallback(() => {
    setSequence((prev) => {
      if (!prev) return prev;
      const previousIndex = Math.max(prev.index - 1, 0);
      const previousId = prev.ids[previousIndex];
      setActiveMarkId(previousId);
      return { ids: prev.ids, index: previousIndex };
    });
  }, []);

  const contextValue = useMemo<CoachMarksContextValue>(
    () => ({
      registerMark,
      unregisterMark,
      showMark,
      hideMark,
      dismissMark,
      startSequence,
      goToNext,
      goToPrevious,
      isDismissed: (id: string) => Boolean(dismissed[id]),
      activeMarkId,
      sequence,
    }),
    [
      registerMark,
      unregisterMark,
      showMark,
      hideMark,
      dismissMark,
      startSequence,
      goToNext,
      goToPrevious,
      dismissed,
      activeMarkId,
      sequence,
    ]
  );

  const activeMark = activeMarkId ? marks.get(activeMarkId) : undefined;
  const activeSequenceIndex = sequence?.index ?? -1;
  const hasNext = Boolean(sequence && sequence.index < sequence.ids.length - 1);
  const hasPrevious = Boolean(sequence && sequence.index > 0);

  return (
    <CoachMarksContext.Provider value={contextValue}>
      {children}
      <CoachMarkPortal
        mark={activeMark}
        onDismiss={dismissMark}
        onClose={hideMark}
        onNext={goToNext}
        onPrevious={goToPrevious}
        hasNext={hasNext}
        hasPrevious={hasPrevious}
        sequenceActive={Boolean(sequence)}
        sequenceIndex={activeSequenceIndex}
      />
    </CoachMarksContext.Provider>
  );
};

export const useCoachMarks = (): CoachMarksContextValue => {
  const ctx = useContext(CoachMarksContext);
  if (!ctx) {
    throw new Error('useCoachMarks must be used within a CoachMarksProvider');
  }
  return ctx;
};

interface CoachMarkPortalProps {
  mark?: CoachMarkConfig;
  onDismiss: (id: string) => void;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  hasNext: boolean;
  hasPrevious: boolean;
  sequenceActive: boolean;
  sequenceIndex: number;
}

const CoachMarkPortal: React.FC<CoachMarkPortalProps> = ({
  mark,
  onDismiss,
  onClose,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  sequenceActive,
  sequenceIndex,
}) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null
  );
  const [placement, setPlacement] = useState<'top' | 'bottom' | 'left' | 'right'>(
    'bottom'
  );
  const descriptionId = useIdCompat('coachmark-description');
  const titleId = useIdCompat('coachmark-title');
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.setAttribute('data-coachmark-portal', 'true');
    document.body.appendChild(el);
    setContainer(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (!mark) {
      setPosition(null);
      return;
    }
    const target = resolveTarget(mark.target);
    if (!target) {
      setPosition(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    const spacing = 12;
    let top = rect.bottom + spacing;
    let left = rect.left;
    let nextPlacement: typeof placement = mark.placement || 'bottom';

    if (mark.placement) {
      nextPlacement = mark.placement;
    } else {
      const viewportHeight = window.innerHeight;
      if (rect.bottom + 200 > viewportHeight) {
        nextPlacement = 'top';
      }
    }

    if (nextPlacement === 'top') {
      top = rect.top - spacing;
    } else if (nextPlacement === 'left') {
      top = rect.top;
      left = rect.left - 320;
    } else if (nextPlacement === 'right') {
      top = rect.top;
      left = rect.right + spacing;
    }

    if (nextPlacement === 'top') {
      top -= 160;
    }

    const maxLeft = window.innerWidth - 320;
    left = Math.min(Math.max(left, 16), Math.max(16, maxLeft));

    setPlacement(nextPlacement);
    setPosition({ top: Math.max(top, 16), left });
  }, [mark]);

  useLayoutEffect(() => {
    updatePosition();
  }, [mark, updatePosition]);

  useEffect(() => {
    if (!mark) return;
    const handle = () => updatePosition();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [mark, updatePosition]);

  useEffect(() => {
    if (!mark) {
      if (previousFocus.current) {
        previousFocus.current.focus();
        previousFocus.current = null;
      }
      return;
    }
    previousFocus.current = document.activeElement as HTMLElement;
    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);
    const target = resolveTarget(mark.target);
    if (target) {
      target.setAttribute('data-coachmark-active', 'true');
      const previousDescribedBy = target.getAttribute('aria-describedby');
      const tokens = new Set(
        previousDescribedBy?.split(/\s+/).filter(Boolean) ?? []
      );
      tokens.add(descriptionId);
      target.setAttribute('aria-describedby', Array.from(tokens).join(' '));
      if (previousDescribedBy) {
        target.setAttribute(
          'data-coachmark-original-describedby',
          previousDescribedBy
        );
      } else {
        target.removeAttribute('data-coachmark-original-describedby');
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      if (target) {
        target.removeAttribute('data-coachmark-active');
        const original = target.getAttribute(
          'data-coachmark-original-describedby'
        );
        if (original) {
          target.setAttribute('aria-describedby', original);
        } else {
          const tokens = new Set(
            target.getAttribute('aria-describedby')?.split(/\s+/).filter(Boolean) ?? []
          );
          tokens.delete(descriptionId);
          if (tokens.size > 0) {
            target.setAttribute('aria-describedby', Array.from(tokens).join(' '));
          } else {
            target.removeAttribute('aria-describedby');
          }
        }
        target.removeAttribute('data-coachmark-original-describedby');
      }
    };
  }, [mark, descriptionId, onClose]);

  if (!container || !mark) {
    return null;
  }

  const target = resolveTarget(mark.target);
  const sequenceLabel =
    sequenceActive && sequenceIndex >= 0
      ? `Step ${sequenceIndex + 1}`
      : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[999] pointer-events-none">
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      {target && (
        <span
          className="pointer-events-none absolute rounded-lg border-2 border-sky-400 shadow-[0_0_0_8px_rgba(56,189,248,0.45)]"
          style={{
            top: target.getBoundingClientRect().top - 8,
            left: target.getBoundingClientRect().left - 8,
            width: target.getBoundingClientRect().width + 16,
            height: target.getBoundingClientRect().height + 16,
          }}
          aria-hidden="true"
        />
      )}
      <div
        className="pointer-events-auto"
        style={{
          position: 'absolute',
          top: position?.top ?? '50%',
          left: position?.left ?? '50%',
          transform:
            position?.top == null
              ? 'translate(-50%, -50%)'
              : placement === 'top'
                ? 'translateY(-100%)'
                : 'none',
          maxWidth: 300,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className="rounded-lg bg-slate-900 text-white shadow-xl ring-1 ring-slate-700 p-4 space-y-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p id={titleId} className="text-sm font-semibold text-sky-300">
                {sequenceLabel}
              </p>
              <h2 className="text-lg font-bold leading-tight">
                {mark.title || 'Guided tip'}
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-sky-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 rounded"
            >
              Close
            </button>
          </div>
          <p id={descriptionId} className="text-sm leading-relaxed text-slate-100">
            {mark.description}
          </p>
          <div className="flex justify-between items-center gap-2 text-sm">
            <div className="flex items-center gap-2">
              {hasPrevious && (
                <button
                  type="button"
                  onClick={onPrevious}
                  className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                >
                  Back
                </button>
              )}
              {hasNext && (
                <button
                  type="button"
                  onClick={onNext}
                  className="rounded bg-sky-600 px-2 py-1 hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 text-white"
                >
                  Next
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(mark.id)}
              className="rounded bg-emerald-600 px-2 py-1 text-white hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>,
    container
  );
};

interface CoachMarkBeaconProps {
  id: string;
  label?: string;
  className?: string;
}

export const CoachMarkBeacon: React.FC<CoachMarkBeaconProps> = ({
  id,
  label = "Learn more about this area",
  className = '',
}) => {
  const { showMark, isDismissed } = useCoachMarks();
  if (isDismissed(id)) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={() => showMark(id)}
      className={`relative inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-400 ${className}`}
      aria-label={label}
    >
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-300 opacity-75" />
      <span className="relative text-base font-bold">?</span>
    </button>
  );
};

interface CoachMarkWhatsThisProps {
  id: string;
  children?: React.ReactNode;
  className?: string;
}

export const CoachMarkWhatsThis: React.FC<CoachMarkWhatsThisProps> = ({
  id,
  children = "What's this?",
  className = '',
}) => {
  const { showMark, isDismissed } = useCoachMarks();
  if (isDismissed(id)) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={() => showMark(id)}
      className={`text-sm font-medium text-sky-500 hover:text-sky-400 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 rounded ${className}`}
    >
      {children}
    </button>
  );
};

const useIdCompat = (prefix: string): string => {
  const [id] = useState(() => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  });
  return id;
};

export default CoachMarksProvider;
