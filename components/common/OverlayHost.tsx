'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import useFocusTrap from '../../hooks/useFocusTrap';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

const createId = () => `ovl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const schedule = (callback: () => void) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(() => callback());
  }
  return setTimeout(callback, 0);
};

export type FocusTarget =
  | string
  | HTMLElement
  | null
  | (() => HTMLElement | string | null);

export interface OverlayOptions {
  trapFocus?: boolean;
  autoFocus?: boolean;
  initialFocus?: FocusTarget;
  restoreFocus?: FocusTarget;
  inertRoot?: FocusTarget;
  zIndex?: number;
}

interface NormalizedOverlayOptions {
  trapFocus: boolean;
  autoFocus: boolean;
  initialFocus?: FocusTarget;
  restoreFocus: HTMLElement | null;
  inertRoot: HTMLElement | null;
  zIndex?: number;
}

interface OverlayEntry {
  id: string;
  node: React.ReactNode;
  options: NormalizedOverlayOptions;
}

export interface OverlayManager {
  push: (node: React.ReactNode, options?: OverlayOptions) => string;
  update: (id: string, node: React.ReactNode, options?: OverlayOptions) => void;
  pop: (id: string) => void;
}

export const OverlayContext = createContext<OverlayManager | null>(null);

const getActiveElement = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body) return null;
  return active;
};

const resolveElement = (target: FocusTarget): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  if (!target) return null;
  if (typeof target === 'function') {
    try {
      const result = target();
      return resolveElement(result as FocusTarget);
    } catch {
      return null;
    }
  }
  if (target instanceof HTMLElement) return target;
  if (typeof target === 'string') {
    try {
      const node = target.startsWith('#') || target.startsWith('.')
        ? document.querySelector(target)
        : document.getElementById(target);
      return node instanceof HTMLElement ? node : null;
    } catch {
      return null;
    }
  }
  return null;
};

const buildOptions = (
  options: OverlayOptions | undefined,
  previous?: NormalizedOverlayOptions,
): NormalizedOverlayOptions => {
  const trapFocus = options?.trapFocus ?? previous?.trapFocus ?? true;
  const autoFocus = options?.autoFocus ?? previous?.autoFocus ?? true;
  const initialFocus =
    options?.initialFocus !== undefined
      ? options.initialFocus
      : previous?.initialFocus ?? null;

  let restoreFocus: HTMLElement | null;
  if (options && Object.prototype.hasOwnProperty.call(options, 'restoreFocus')) {
    restoreFocus = resolveElement(options.restoreFocus ?? null);
  } else if (previous) {
    restoreFocus = previous.restoreFocus;
  } else {
    restoreFocus = getActiveElement();
  }

  let inertRoot: HTMLElement | null;
  if (options && Object.prototype.hasOwnProperty.call(options, 'inertRoot')) {
    inertRoot = resolveElement(options.inertRoot ?? null);
  } else {
    inertRoot = previous?.inertRoot ?? null;
  }

  const zIndex = options?.zIndex ?? previous?.zIndex;

  return {
    trapFocus,
    autoFocus,
    initialFocus,
    restoreFocus,
    inertRoot,
    zIndex,
  };
};

const findFirstFocusable = (container: HTMLElement): HTMLElement | null => {
  const nodes = Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
  );
  for (const node of nodes) {
    if (!node.hasAttribute('disabled') && !node.getAttribute('aria-hidden')) {
      return node;
    }
  }
  return null;
};

const focusOverlay = (entry: OverlayEntry, container: HTMLElement) => {
  if (!entry.options.autoFocus) return;
  let target: HTMLElement | null = null;
  const { initialFocus } = entry.options;
  if (initialFocus) {
    if (typeof initialFocus === 'function') {
      try {
        const resolved = initialFocus();
        if (resolved) {
          target = resolveElement(resolved as FocusTarget);
        }
      } catch {
        target = null;
      }
    } else if (typeof initialFocus === 'string' || initialFocus instanceof HTMLElement) {
      target = resolveElement(initialFocus);
    }
  }

  if (!target || !container.contains(target)) {
    target = findFirstFocusable(container) ?? null;
  }

  if (!target || !container.contains(target)) {
    target = container;
  }

  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
};

const OverlayLayer: React.FC<{
  entry: OverlayEntry;
  zIndex: number;
  isTop: boolean;
  register: (id: string, element: HTMLDivElement | null) => void;
}> = ({ entry, zIndex, isTop, register }) => {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref as React.RefObject<HTMLElement>, isTop && entry.options.trapFocus);

  useEffect(() => {
    register(entry.id, ref.current);
    return () => register(entry.id, null);
  }, [entry.id, register]);

  return (
    <div
      ref={ref}
      data-overlay-layer
      style={{ position: 'relative', zIndex, outline: 'none' }}
      tabIndex={-1}
    >
      {entry.node}
    </div>
  );
};

const OverlayHost: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<OverlayEntry[]>([]);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const layerRefs = useRef(new Map<string, HTMLDivElement | null>());
  const inertCounts = useRef(new Map<HTMLElement, number>());
  const previousEntriesRef = useRef<OverlayEntry[]>([]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const node = document.createElement('div');
    node.setAttribute('data-overlay-host', 'true');
    portalRef.current = node;
    document.body.appendChild(node);
    return () => {
      document.body.removeChild(node);
      portalRef.current = null;
    };
  }, []);

  const registerLayer = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      layerRefs.current.set(id, element);
    } else {
      layerRefs.current.delete(id);
    }
  }, []);

  const push = useCallback<OverlayManager['push']>((node, options) => {
    const id = createId();
    const normalized = buildOptions(options);
    setEntries(prev => [...prev, { id, node, options: normalized }]);
    return id;
  }, []);

  const update = useCallback<OverlayManager['update']>((id, node, options) => {
    setEntries(prev =>
      prev.map(entry =>
        entry.id === id
          ? {
              id,
              node,
              options: buildOptions(options, entry.options),
            }
          : entry,
      ),
    );
  }, []);

  const pop = useCallback<OverlayManager['pop']>(id => {
    setEntries(prev => prev.filter(entry => entry.id !== id));
  }, []);

  const manager = useMemo<OverlayManager>(() => ({ push, update, pop }), [pop, push, update]);

  const incrementInert = useCallback((element: HTMLElement) => {
    const counts = inertCounts.current;
    const next = (counts.get(element) ?? 0) + 1;
    counts.set(element, next);
    if (next === 1) {
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    }
  }, []);

  const decrementInert = useCallback((element: HTMLElement) => {
    const counts = inertCounts.current;
    const current = counts.get(element);
    if (!current) return;
    if (current <= 1) {
      counts.delete(element);
      element.removeAttribute('inert');
      element.removeAttribute('aria-hidden');
    } else {
      counts.set(element, current - 1);
    }
  }, []);

  useEffect(() => {
    const previousEntries = previousEntriesRef.current;
    const prevMap = new Map(previousEntries.map(entry => [entry.id, entry] as const));
    const nextMap = new Map(entries.map(entry => [entry.id, entry] as const));

    // Handle inert roots
    previousEntries.forEach(entry => {
      const next = nextMap.get(entry.id);
      if (!next || next.options.inertRoot !== entry.options.inertRoot) {
        if (entry.options.inertRoot) {
          decrementInert(entry.options.inertRoot);
        }
      }
    });

    entries.forEach(entry => {
      const prev = prevMap.get(entry.id);
      if (!prev || prev.options.inertRoot !== entry.options.inertRoot) {
        if (entry.options.inertRoot) {
          incrementInert(entry.options.inertRoot);
        }
      }
    });

    // Restore focus for removed overlays
    previousEntries
      .filter(entry => !nextMap.has(entry.id))
      .forEach(entry => {
        const target = entry.options.restoreFocus;
        if (target && target.isConnected) {
          schedule(() => {
            try {
              target.focus({ preventScroll: true });
            } catch {
              target.focus();
            }
          });
        }
      });

    // Focus newly added overlays
    const added = entries.filter(entry => !prevMap.has(entry.id));
    if (added.length > 0) {
      const newest = added[added.length - 1];
      const container = layerRefs.current.get(newest.id);
      if (container) {
        schedule(() => focusOverlay(newest, container));
      }
    }

    previousEntriesRef.current = entries;
  }, [decrementInert, entries, incrementInert]);

  if (!portalRef.current) {
    return <OverlayContext.Provider value={manager}>{children}</OverlayContext.Provider>;
  }

  return (
    <OverlayContext.Provider value={manager}>
      {children}
      {createPortal(
        entries.map((entry, index) => (
          <OverlayLayer
            key={entry.id}
            entry={entry}
            isTop={index === entries.length - 1}
            register={registerLayer}
            zIndex={entry.options.zIndex ?? 1000 + index * 10}
          />
        )),
        portalRef.current,
      )}
    </OverlayContext.Provider>
  );
};

export interface OverlayMountRenderProps {
  close: () => void;
  id: string;
}

export interface OverlayMountProps {
  open: boolean;
  options?: OverlayOptions;
  children: React.ReactNode | ((props: OverlayMountRenderProps) => React.ReactNode);
}

export const OverlayMount: React.FC<OverlayMountProps> = ({ open, options, children }) => {
  const overlay = useContext(OverlayContext);
  if (!overlay) {
    throw new Error('OverlayMount must be used within an OverlayHost');
  }
  const idRef = useRef<string | null>(null);

  const close = useCallback(() => {
    const id = idRef.current;
    if (!id) return;
    overlay.pop(id);
    idRef.current = null;
  }, [overlay]);

  useEffect(() => {
    return () => {
      if (idRef.current) {
        overlay.pop(idRef.current);
        idRef.current = null;
      }
    };
  }, [overlay]);

  useEffect(() => {
    if (!open) {
      if (idRef.current) {
        overlay.pop(idRef.current);
        idRef.current = null;
      }
      return;
    }

    const node =
      typeof children === 'function'
        ? (children as (props: OverlayMountRenderProps) => React.ReactNode)({
            close,
            id: idRef.current ?? 'pending',
          })
        : children;

    if (idRef.current) {
      overlay.update(idRef.current, node, options);
    } else {
      const id = overlay.push(node, options);
      idRef.current = id;
    }
  }, [children, close, open, overlay, options]);

  return null;
};

export default OverlayHost;
