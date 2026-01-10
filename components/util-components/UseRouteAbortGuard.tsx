import { useEffect, useRef } from 'react';
import { NextRouter, useRouter } from 'next/router';

type TransitionOptions = Parameters<NextRouter['push']>[2];

type NavigationAction = 'route' | 'reload';

export interface ConfirmNavigationContext {
  action: NavigationAction;
  destination?: string;
  options?: TransitionOptions;
}

export type ConfirmNavigationHandler = (
  context: ConfirmNavigationContext,
) => boolean | Promise<boolean>;

export interface UseRouteAbortGuardProps {
  /**
   * Indicates whether there are unsaved changes that should block navigation.
   */
  isDirty: boolean;
  /**
   * Optional handler used to present a custom confirmation UI.
   * Return `true` to allow navigation or `false` to keep the user on the page.
   * Promises are supported to facilitate modal flows.
   */
  confirmNavigation?: ConfirmNavigationHandler;
  /**
   * Message displayed when the user attempts to refresh/close the tab.
   */
  message?: string;
  /**
   * Allows the guard to be toggled without unmounting the component.
   */
  enabled?: boolean;
}

const DEFAULT_MESSAGE = 'You have unsaved changes. Are you sure you want to leave this page?';

const isPromise = <T,>(value: unknown): value is Promise<T> =>
  typeof value === 'object' && value !== null && 'then' in (value as Record<string, unknown>);

const createAbortError = () => {
  const error = new Error('Route change aborted due to unsaved changes.');
  error.name = 'RouteChangeAborted';
  return error;
};

export function UseRouteAbortGuard({
  isDirty,
  confirmNavigation,
  message,
  enabled = true,
}: UseRouteAbortGuardProps) {
  const router = useRouter();

  const isDirtyRef = useRef(isDirty);
  const enabledRef = useRef(enabled);
  const messageRef = useRef(message ?? DEFAULT_MESSAGE);
  const confirmRef = useRef<ConfirmNavigationHandler | null>(null);
  const bypassRef = useRef(false);
  const pendingNavigationRef = useRef<{
    url: string;
    options?: TransitionOptions;
  } | null>(null);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    messageRef.current = message ?? DEFAULT_MESSAGE;
  }, [message]);

  useEffect(() => {
    if (confirmNavigation) {
      confirmRef.current = confirmNavigation;
    } else {
      confirmRef.current = () => window.confirm(messageRef.current);
    }
  }, [confirmNavigation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const abortNavigation = () => {
      router.events.emit('routeChangeError');
      throw createAbortError();
    };

    const resumePendingNavigation = () => {
      const pending = pendingNavigationRef.current;
      if (!pending) return;

      bypassRef.current = true;
      router
        .push(pending.url, undefined, pending.options)
        .catch(() => {
          // Swallow errors caused by navigation cancellation.
        })
        .finally(() => {
          bypassRef.current = false;
          pendingNavigationRef.current = null;
        });
    };

    const handleRouteChangeStart = (url: string, options?: TransitionOptions) => {
      if (!enabledRef.current || !isDirtyRef.current || bypassRef.current) {
        return;
      }

      if (router.asPath === url) {
        return;
      }

      const handler = confirmRef.current ?? (() => window.confirm(messageRef.current));
      const result = handler({
        action: 'route',
        destination: url,
        options,
      });

      if (isPromise<boolean>(result)) {
        pendingNavigationRef.current = { url, options };
        result
          .then((allow) => {
            if (allow) {
              resumePendingNavigation();
            } else {
              pendingNavigationRef.current = null;
            }
          })
          .catch(() => {
            pendingNavigationRef.current = null;
          });
        abortNavigation();
      }

      if (!result) {
        abortNavigation();
      }
    };

    const handleRouteChangeComplete = () => {
      bypassRef.current = false;
      pendingNavigationRef.current = null;
    };

    const handleRouteChangeError = () => {
      bypassRef.current = false;
    };

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enabledRef.current || !isDirtyRef.current) {
        return;
      }

      const text = messageRef.current;
      event.preventDefault();
      // Chrome requires returnValue to be set.
      event.returnValue = text;
      return text;
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      pendingNavigationRef.current = null;
      bypassRef.current = false;
    };
  }, [router]);

  return null;
}

export default UseRouteAbortGuard;
