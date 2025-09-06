export const mimeKey = (mime: string) => `mimeDefault:${mime}`;

export const setDefaultApp = (mime: string, app: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(mimeKey(mime), app);
};

export const getDefaultApp = (mime: string): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(mimeKey(mime));
};

export const openWithDefault = (
  mime: string,
  openApp: (app: string) => void,
  fallback?: () => void,
): boolean => {
  const app = getDefaultApp(mime);
  if (app) {
    openApp(app);
    return true;
  }
  if (fallback) fallback();
  return false;
};
