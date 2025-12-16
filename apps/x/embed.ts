export type TwttrWidgets = {
  createTimeline: (
    source: Record<string, unknown>,
    element: HTMLElement,
    options?: Record<string, unknown>,
  ) => Promise<HTMLElement>;
};

export const EMBED_SCRIPT_SRC = 'https://embed.x.com/widgets.js';
const FAILED_ATTR = 'data-x-embed-failed';
const FAILED_REASON_ATTR = 'data-x-embed-failed-reason';

declare global {
  interface Window {
    twttr?: {
      widgets?: TwttrWidgets;
      ready?: (cb: (context: { widgets: TwttrWidgets }) => void) => void;
    };
  }
}

export async function loadEmbedScript(
  timeoutMs = 10000,
): Promise<TwttrWidgets | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (window.twttr?.widgets) {
    return window.twttr.widgets;
  }

  return new Promise<TwttrWidgets | null>((resolve) => {
    const existing = document.querySelector(
      `script[src="${EMBED_SCRIPT_SRC}"]`,
    );

    let script: HTMLScriptElement;
    let needsAppend = false;
    if (existing instanceof HTMLScriptElement) {
      // If a previous attempt failed, remove and try again (e.g. user disabled blockers).
      if (existing.getAttribute(FAILED_ATTR) === 'true') {
        existing.remove();
        script = document.createElement('script');
        script.async = true;
        script.src = EMBED_SCRIPT_SRC;
        needsAppend = true;
      } else {
        script = existing;
      }
    } else {
      script = document.createElement('script');
      script.async = true;
      script.src = EMBED_SCRIPT_SRC;
      needsAppend = true;
    }

    let pollId = 0;
    let timeoutId = 0;

    const cleanup = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (pollId) window.clearInterval(pollId);
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
    };

    const finish = (widgets: TwttrWidgets) => {
      cleanup();
      resolve(widgets);
    };

    const fail = (message: string) => {
      cleanup();
      try {
        script.setAttribute(FAILED_ATTR, 'true');
        script.setAttribute(FAILED_REASON_ATTR, message);
      } catch {
        // ignore attribute errors
      }
      resolve(null);
    };

    const inspectWidgets = () => {
      const twttr = window.twttr;
      if (!twttr) return false;
      if (twttr.widgets) {
        finish(twttr.widgets);
        return true;
      }
      if (typeof twttr.ready === 'function') {
        twttr.ready((ctx) => {
          if (ctx.widgets) {
            finish(ctx.widgets);
          } else {
            fail('X embed widgets unavailable');
          }
        });
        return true;
      }
      return false;
    };

    const handleLoad = () => {
      if (inspectWidgets()) return;
      pollId = window.setInterval(() => {
        if (inspectWidgets()) {
          window.clearInterval(pollId);
        }
      }, 50);
    };

    const handleError = () => {
      fail('Failed to load X embed script');
    };

    timeoutId = window.setTimeout(() => {
      fail('X embed script timed out');
    }, timeoutMs);

    if (inspectWidgets()) {
      return;
    }

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    if (needsAppend) {
      document.body.appendChild(script);
    }
  });
}
