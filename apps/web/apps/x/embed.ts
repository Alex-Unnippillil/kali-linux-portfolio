export type TwttrWidgets = {
  createTimeline: (
    source: Record<string, unknown>,
    element: HTMLElement,
    options?: Record<string, unknown>,
  ) => Promise<HTMLElement>;
};

export const EMBED_SCRIPT_SRC = 'https://embed.x.com/widgets.js';

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
): Promise<TwttrWidgets> {
  if (typeof window === 'undefined') {
    throw new Error('X embed script requires a browser environment.');
  }

  if (window.twttr?.widgets) {
    return window.twttr.widgets;
  }

  return new Promise<TwttrWidgets>((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${EMBED_SCRIPT_SRC}"]`,
    );

    let script: HTMLScriptElement;
    let needsAppend = false;
    if (existing instanceof HTMLScriptElement) {
      script = existing;
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
      reject(new Error(message));
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
