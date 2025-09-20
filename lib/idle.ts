export type IdleCancel = () => void;
export type IdleTask = () => void;

const hasWindow = typeof window !== 'undefined';
const hasDocument = typeof document !== 'undefined';

export function onIdle(callback: IdleTask): IdleCancel {
  if (!hasWindow || !hasDocument) {
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) callback();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }

  let cancelled = false;
  let cancelCurrent: IdleCancel | null = null;

  const schedule = () => {
    if (cancelled) return;
    if ('requestIdleCallback' in window) {
      const handle = window.requestIdleCallback(() => {
        if (!cancelled) callback();
      });
      cancelCurrent = () => window.cancelIdleCallback(handle);
    } else {
      const timeout = window.setTimeout(() => {
        if (!cancelled) callback();
      }, 50);
      cancelCurrent = () => window.clearTimeout(timeout);
    }
  };

  if (document.readyState === 'complete') {
    schedule();
  } else {
    const handleLoad = () => {
      window.removeEventListener('load', handleLoad);
      schedule();
    };
    window.addEventListener('load', handleLoad);
    cancelCurrent = () => {
      window.removeEventListener('load', handleLoad);
    };
  }

  return () => {
    cancelled = true;
    cancelCurrent?.();
  };
}

export default onIdle;
