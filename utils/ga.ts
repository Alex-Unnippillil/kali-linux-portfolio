export type GAEventParams = {
  id: string;
  action?: string;
  [key: string]: unknown;
};

export function logEvent(event: string, params: GAEventParams): void {
  try {
    const gtag = (window as any)?.gtag;
    if (typeof gtag === 'function') {
      gtag('event', event, params);
    }
  } catch {
    // ignore analytics errors
  }
}
