import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import ConfirmDialog from './base/ConfirmDialog';

type NavigationBlockerConfig = {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

type NavigationBlockState = Required<Pick<NavigationBlockerConfig, 'title' | 'description' | 'confirmLabel' | 'cancelLabel'>> &
  Pick<NavigationBlockerConfig, 'onConfirm' | 'onCancel'>;

type RouteChangeStartOptions = {
  shallow?: boolean;
  locale?: string | false;
  scroll?: boolean;
  [key: string]: unknown;
};

type PendingNavigation = {
  url: string;
  as?: string;
  options?: RouteChangeStartOptions;
};

type RouteAbortController = AbortController & {
  blockNavigation: (config?: NavigationBlockerConfig) => void;
  releaseNavigation: () => void;
  isNavigationBlocked: () => boolean;
};

const DEFAULT_DIALOG: NavigationBlockState = {
  title: 'Leave this page?',
  description: 'You have unsaved changes. If you leave now, your progress may be lost.',
  confirmLabel: 'Leave page',
  cancelLabel: 'Stay here',
};

declare global {
  interface Window {
    routeAbortController?: RouteAbortController;
  }
}

export default function UseRouteAbortGuard() {
  const router = useRouter();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<NavigationBlockState>({ ...DEFAULT_DIALOG });
  const blockStateRef = useRef<NavigationBlockState | null>(null);
  const pendingNavigationRef = useRef<PendingNavigation | null>(null);
  const allowNavigationRef = useRef(false);

  const blockNavigation = useCallback((config?: NavigationBlockerConfig) => {
    const merged: NavigationBlockState = {
      ...DEFAULT_DIALOG,
      ...config,
    };
    blockStateRef.current = merged;
    setDialogContent({
      title: merged.title,
      description: merged.description,
      confirmLabel: merged.confirmLabel,
      cancelLabel: merged.cancelLabel,
    });
  }, []);

  const releaseNavigation = useCallback(() => {
    blockStateRef.current = null;
    setDialogOpen(false);
    setDialogContent({ ...DEFAULT_DIALOG });
  }, []);

  const createRouteAbortController = useCallback((): RouteAbortController => {
    const controller = new AbortController() as RouteAbortController;
    controller.blockNavigation = blockNavigation;
    controller.releaseNavigation = releaseNavigation;
    controller.isNavigationBlocked = () => blockStateRef.current !== null;
    return controller;
  }, [blockNavigation, releaseNavigation]);

  const handleNavigationBlocked = useCallback((url: string, options: RouteChangeStartOptions) => {
      const blockedState = blockStateRef.current;
      if (!blockedState) return null;
      pendingNavigationRef.current = {
        url,
        options,
      };
      setDialogOpen(true);
      const error = new Error('Route change aborted by UseRouteAbortGuard');
      (error as Error & { cancelled?: boolean }).cancelled = true;
      router.events.emit('routeChangeError', error, url, options);
      return error;
    },
    [router.events],
  );

  const handleRouteChangeStart = useCallback(
    (url: string, options: RouteChangeStartOptions) => {
      const controller = window.routeAbortController;
      controller?.abort();
      window.routeAbortController = createRouteAbortController();
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return;
      }
      const navigationError = handleNavigationBlocked(url, options);
      if (navigationError) {
        throw navigationError;
      }
    },
    [createRouteAbortController, handleNavigationBlocked],
  );

  const handlePopState = useCallback(
    (state: { url?: string; as?: string; options?: RouteChangeStartOptions }) => {
      const controller = window.routeAbortController;
      controller?.abort();
      window.routeAbortController = createRouteAbortController();
      if (allowNavigationRef.current) {
        allowNavigationRef.current = false;
        return true;
      }
      if (!blockStateRef.current) {
        return true;
      }
      const url = state?.as ?? state?.url;
      if (!url) {
        return true;
      }
      pendingNavigationRef.current = {
        url,
        as: state?.as,
        options: state?.options ?? {},
      };
      setDialogOpen(true);
      return false;
    },
    [createRouteAbortController],
  );

  const handleConfirm = useCallback(() => {
    const pending = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    const blockedState = blockStateRef.current;
    blockedState?.onConfirm?.();
    blockStateRef.current = null;
    setDialogContent({ ...DEFAULT_DIALOG });
    setDialogOpen(false);
    allowNavigationRef.current = true;
    if (pending) {
      router.push(pending.url, pending.as, pending.options);
    }
  }, [router]);

  const handleCancel = useCallback(() => {
    pendingNavigationRef.current = null;
    const blockedState = blockStateRef.current;
    blockedState?.onCancel?.();
    setDialogOpen(false);
  }, []);

  useEffect(() => {
    window.routeAbortController = createRouteAbortController();
    return () => {
      window.routeAbortController?.abort();
      delete window.routeAbortController;
    };
  }, [createRouteAbortController]);

  useEffect(() => {
    router.events.on('routeChangeStart', handleRouteChangeStart);
    const handleComplete = () => {
      allowNavigationRef.current = false;
      pendingNavigationRef.current = null;
    };
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [handleRouteChangeStart, router.events]);

  useEffect(() => {
    router.beforePopState(handlePopState);
    return () => {
      router.beforePopState(() => true);
    };
  }, [handlePopState, router]);

  return (
    <ConfirmDialog
      isOpen={isDialogOpen}
      title={dialogContent.title}
      description={dialogContent.description}
      confirmLabel={dialogContent.confirmLabel}
      cancelLabel={dialogContent.cancelLabel}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}
