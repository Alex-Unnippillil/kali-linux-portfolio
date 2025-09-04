import { isBrowser } from './isBrowser';

// Simple helper around the Web Share API
export const canShare = () =>
  isBrowser && typeof globalThis.navigator.share === 'function';

// Shares the provided text along with optional title and url
export const share = async (
  text: string,
  title?: string,
  url?: string
): Promise<boolean> => {
  if (!canShare()) return false;
  try {
    await globalThis.navigator.share({ text, title, url: url ?? globalThis.location.href });
    return true;
  } catch {
    return false;
  }
};

export default share;
