"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import RouteChangeConfirmationModal, {
  type ConfirmationDialogCopy,
} from './common/RouteChangeConfirmationModal';

export interface RouteAbortConfirmationConfig {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export type RouteAbortController = AbortController & {
  shouldConfirm: () => boolean;
  getConfirmation: () => RouteAbortConfirmationConfig | undefined;
  setConfirmation: (config?: RouteAbortConfirmationConfig) => void;
  clearConfirmation: () => void;
};

declare global {
  interface Window {
    routeAbortController?: RouteAbortController;
  }
}

interface PendingNavigation {
  proceed: () => Promise<boolean> | boolean | void;
  resolve?: (value: boolean) => void;
  reject?: (reason?: unknown) => void;
  copy: ConfirmationDialogCopy;
}

const DEFAULT_DIALOG_COPY: ConfirmationDialogCopy = {
  title: 'Abort running task?',
  description: 'Leaving this screen will stop the current operation.',
  confirmLabel: 'Leave',
  cancelLabel: 'Stay',
};

const createRouteAbortController = (): RouteAbortController => {
  const controller = new AbortController() as RouteAbortController;
  const { signal } = controller;
  const abortListeners = new Set<EventListenerOrEventListenerObject>();
  let confirmation: RouteAbortConfirmationConfig | undefined;

  const originalAdd = signal.addEventListener.bind(signal);
  signal.addEventListener = ((type, listener, options) => {
    if (type === 'abort' && listener) {
      abortListeners.add(listener);
    }
    return originalAdd(type, listener as EventListenerOrEventListenerObject, options);
  }) as typeof signal.addEventListener;

  const originalRemove = signal.removeEventListener.bind(signal);
  signal.removeEventListener = ((type, listener, options) => {
    if (type === 'abort' && listener) {
      abortListeners.delete(listener);
    }
    return originalRemove(type, listener as EventListenerOrEventListenerObject, options);
  }) as typeof signal.removeEventListener;

  const descriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(signal),
    'onabort',
  );

  if (descriptor?.get && descriptor?.set && descriptor.configurable !== false) {
    Object.defineProperty(signal, 'onabort', {
      configurable: true,
      enumerable: descriptor.enumerable ?? false,
      get() {
        return descriptor.get!.call(signal);
      },
      set(value) {
        const previous = descriptor.get!.call(signal);
        if (previous) {
          abortListeners.delete(previous as EventListenerOrEventListenerObject);
        }
        descriptor.set!.call(signal, value);
        if (value) {
          abortListeners.add(value);
        }
      },
    });
  }

  controller.shouldConfirm = () =>
    !controller.signal.aborted && (abortListeners.size > 0 || Boolean(confirmation));

  controller.getConfirmation = () => confirmation;

  controller.setConfirmation = (config?: RouteAbortConfirmationConfig) => {
    confirmation = config;
  };

  controller.clearConfirmation = () => {
    confirmation = undefined;
  };

  return controller;
};

const getRouteAbortController = () =>
  (typeof window !== 'undefined' ? window.routeAbortController : undefined);

export default function UseRouteAbortGuard() {
  const router = useRouter();
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(
    null,
  );

  useEffect(() => {
    const assignController = () => {
      window.routeAbortController = createRouteAbortController();
    };

    assignController();

    const handleRouteChangeStart = () => {
      window.routeAbortController?.abort();
      assignController();
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      window.routeAbortController?.abort();
      delete window.routeAbortController;
    };
  }, [router.events]);

  useEffect(() => {
    const originalPush = router.push.bind(router);
    const originalReplace = router.replace.bind(router);
    const originalBack = router.back.bind(router);

    const wrapAsyncNavigation = (
      method: typeof router.push,
    ): typeof router.push => {
      return (async (...args) => {
        const controller = getRouteAbortController();
        if (!controller?.shouldConfirm?.()) {
          return method(...args);
        }

        const copy = {
          ...DEFAULT_DIALOG_COPY,
          ...controller.getConfirmation?.(),
        } satisfies ConfirmationDialogCopy;

        return new Promise<boolean>((resolve, reject) => {
          setPendingNavigation({
            copy,
            proceed: () => method(...args),
            resolve,
            reject,
          });
        });
      }) as typeof router.push;
    };

    router.push = wrapAsyncNavigation(originalPush);
    router.replace = wrapAsyncNavigation(originalReplace as typeof router.push) as typeof router.replace;

    router.back = () => {
      const controller = getRouteAbortController();
      if (!controller?.shouldConfirm?.()) {
        originalBack();
        return;
      }

      const copy = {
        ...DEFAULT_DIALOG_COPY,
        ...controller.getConfirmation?.(),
      } satisfies ConfirmationDialogCopy;

      setPendingNavigation({
        copy,
        proceed: () => {
          originalBack();
          return true;
        },
      });
    };

    return () => {
      router.push = originalPush;
      router.replace = originalReplace;
      router.back = originalBack;
    };
  }, [router]);

  const handleConfirm = useCallback(() => {
    if (!pendingNavigation) return;
    const nav = pendingNavigation;
    const controller = getRouteAbortController();
    controller?.abort();
    controller?.clearConfirmation?.();
    setPendingNavigation(null);

    Promise.resolve(nav.proceed())
      .then((result) => {
        const value = typeof result === 'boolean' ? result : true;
        nav.resolve?.(value);
      })
      .catch((error) => {
        nav.reject?.(error);
      });
  }, [pendingNavigation]);

  const handleCancel = useCallback(() => {
    if (!pendingNavigation) return;
    const nav = pendingNavigation;
    const controller = getRouteAbortController();
    controller?.clearConfirmation?.();
    nav.reject?.(new Error('Navigation cancelled by user'));
    setPendingNavigation(null);
  }, [pendingNavigation]);

  const dialogCopy = pendingNavigation?.copy ?? DEFAULT_DIALOG_COPY;

  return (
    <RouteChangeConfirmationModal
      isOpen={Boolean(pendingNavigation)}
      title={dialogCopy.title}
      description={dialogCopy.description}
      confirmLabel={dialogCopy.confirmLabel}
      cancelLabel={dialogCopy.cancelLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}

