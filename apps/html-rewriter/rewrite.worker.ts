import { applyRewriteRules, type RewriteRule } from './transformer';

type RewriteRequest = {
  html: string;
  rules: RewriteRule[];
};

type RewriteResponse =
  | {
      type: 'result';
      originalHtml: string;
      rewrittenHtml: string;
      appliedCount: number;
      messages: string[];
      runtimeMs: number;
    }
  | {
      type: 'error';
      message: string;
    };

self.onmessage = (event: MessageEvent<RewriteRequest>) => {
  const { html, rules } = event.data;

  const getNow = () => {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  };

  const start = getNow();

  try {
    const summary = applyRewriteRules(html, rules);
    const end = getNow();
    const response: RewriteResponse = {
      type: 'result',
      originalHtml: html,
      rewrittenHtml: summary.html,
      appliedCount: summary.appliedCount,
      messages: summary.messages,
      runtimeMs: Math.max(0, Math.round(end - start)),
    };
    self.postMessage(response);
  } catch (error: any) {
    const response: RewriteResponse = {
      type: 'error',
      message: error?.message ? String(error.message) : 'Failed to rewrite HTML.',
    };
    self.postMessage(response);
  }
};
