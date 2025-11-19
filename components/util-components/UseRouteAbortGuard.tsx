import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';

type DialogCopy = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
};

type PushArgs = Parameters<ReturnType<typeof useRouter>['push']>;
type ReplaceArgs = Parameters<ReturnType<typeof useRouter>['replace']>;

type PendingTransition =
  | { type: 'push'; args: PushArgs }
  | { type: 'replace'; args: ReplaceArgs }
  | { type: 'popstate'; delta: number; url: string };

const DEFAULT_COPY: DialogCopy = {
  title: 'Leave this screen?',
  description: 'If you navigate away now, active tasks and in-progress work will be cancelled.',
  confirmLabel: 'Leave',
  cancelLabel: 'Stay',
};

type RouteAbortGuardApi = {
  enable: () => void;
  disable: () => void;
  isEnabled: () => boolean;
  setCopy: (copy: Partial<DialogCopy>) => void;
};

declare global {
  interface Window {
    routeAbortController?: AbortController;
    routeAbortGuard?: RouteAbortGuardApi;
  }
}

export default function UseRouteAbortGuard() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copy, setCopy] = useState<DialogCopy>(DEFAULT_COPY);
  const portalNodeRef = useRef<HTMLDivElement | null>(null);
  const pendingTransitionRef = useRef<PendingTransition | null>(null);
  const allowNavigationRef = useRef(false);
  const shouldBlockRef = useRef(true);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const originalPushRef = useRef<((...args: PushArgs) => Promise<boolean>) | null>(null);
  const originalReplaceRef = useRef<((...args: ReplaceArgs) => Promise<boolean>) | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = document.createElement('div');
    node.setAttribute('data-route-guard-root', '');
    document.body.appendChild(node);
    portalNodeRef.current = node;
    return () => {
      if (portalNodeRef.current) {
        document.body.removeChild(portalNodeRef.current);
        portalNodeRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!dialogOpen) return;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [dialogOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.routeAbortController = new AbortController();
    return () => {
      window.routeAbortController?.abort();
      delete window.routeAbortController;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const api: RouteAbortGuardApi = {
      enable: () => {
        shouldBlockRef.current = true;
      },
      disable: () => {
        shouldBlockRef.current = false;
        pendingTransitionRef.current = null;
        setDialogOpen(false);
      },
      isEnabled: () => shouldBlockRef.current,
      setCopy: (next) => {
        setCopy((prev) => ({ ...prev, ...next }));
      },
    };
    window.routeAbortGuard = api;
    return () => {
      if (window.routeAbortGuard === api) {
        delete window.routeAbortGuard;
      }
    };
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    if (typeof document === 'undefined') return;
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      previouslyFocusedRef.current = active;
    }
    const frame = requestAnimationFrame(() => {
      cancelButtonRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [dialogOpen]);

  useEffect(() => {
    const routerAny = router as typeof router & {
      push: (...args: PushArgs) => Promise<boolean>;
      replace: (...args: ReplaceArgs) => Promise<boolean>;
    };

    const originalPush = router.push;
    const originalReplace = router.replace;

    originalPushRef.current = (...args) => originalPush.apply(router, args);
    originalReplaceRef.current = (...args) => originalReplace.apply(router, args);

    const wrappedPush: typeof router.push = (...args) => {
      if (!shouldBlockRef.current) {
        return originalPushRef.current?.(...args) ?? Promise.resolve(false);
      }
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return originalPushRef.current?.(...args) ?? Promise.resolve(false);
      }
      pendingTransitionRef.current = { type: 'push', args };
      setDialogOpen(true);
      return Promise.resolve(false);
    };

    const wrappedReplace: typeof router.replace = (...args) => {
      if (!shouldBlockRef.current) {
        return originalReplaceRef.current?.(...args) ?? Promise.resolve(false);
      }
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return originalReplaceRef.current?.(...args) ?? Promise.resolve(false);
      }
      pendingTransitionRef.current = { type: 'replace', args };
      setDialogOpen(true);
      return Promise.resolve(false);
    };

    routerAny.push = wrappedPush;
    routerAny.replace = wrappedReplace;

    return () => {
      routerAny.push = originalPush;
      routerAny.replace = originalReplace;
    };
  }, [router]);

  useEffect(() => {
    const guardPopState = (state: any) => {
      if (!shouldBlockRef.current) return true;
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return true;
      }
      if (typeof window === 'undefined') return true;
      const currentIdx = typeof window.history.state?.idx === 'number' ? window.history.state.idx : 0;
      const targetIdx = typeof state?.idx === 'number' ? state.idx : currentIdx - 1;
      const delta = targetIdx - currentIdx;
      if (delta === 0) return true;
      pendingTransitionRef.current = {
        type: 'popstate',
        delta,
        url: typeof state?.as === 'string' ? state.as : typeof state?.url === 'string' ? state.url : '',
      };
      setDialogOpen(true);
      return false;
    };

    router.beforePopState(guardPopState);
    return () => {
      router.beforePopState(() => true);
    };
  }, [router]);

  const handleCancel = useCallback(() => {
    pendingTransitionRef.current = null;
    setDialogOpen(false);
  }, []);

  const handleConfirm = useCallback(() => {
    const pending = pendingTransitionRef.current;
    pendingTransitionRef.current = null;
    setDialogOpen(false);
    if (!pending) return;
    if (typeof window !== 'undefined') {
      window.routeAbortController?.abort();
      window.routeAbortController = new AbortController();
    }
    if (pending.type === 'push') {
      originalPushRef.current?.(...pending.args);
    } else if (pending.type === 'replace') {
      originalReplaceRef.current?.(...pending.args);
    } else if (pending.type === 'popstate') {
      if (typeof window !== 'undefined') {
        allowNavigationRef.current = true;
        window.history.go(pending.delta);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!dialogOpen) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialogOpen, handleCancel]);

  if (!dialogOpen || !portalNodeRef.current) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 px-4 py-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-guard-title"
        aria-describedby="route-guard-description"
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-white p-6 text-gray-900 shadow-2xl"
        style={{ maxHeight: 'calc(100vh - 64px)' }}
      >
        <div className="space-y-2">
          <h2 id="route-guard-title" className="text-lg font-semibold text-gray-900">
            {copy.title}
          </h2>
          <p id="route-guard-description" className="text-sm text-gray-600">
            {copy.description}
          </p>
        </div>
        <div className="mt-auto flex flex-col gap-3 sm:flex-row">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={handleCancel}
            className="min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-4 text-center text-sm font-medium text-gray-900 transition-colors focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:flex-1"
          >
            {copy.cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="min-h-[44px] w-full rounded-xl bg-blue-600 px-4 text-center text-sm font-semibold text-white shadow-sm transition-colors focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:flex-1"
          >
            {copy.confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    portalNodeRef.current,
  );
}
