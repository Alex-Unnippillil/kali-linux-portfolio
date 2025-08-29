export const trackEvent = (
  name: string,
  props: Record<string, any> = {},
): void => {
  try {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', name, props);
    }
  } catch {
    // Ignore analytics errors
  }
};

