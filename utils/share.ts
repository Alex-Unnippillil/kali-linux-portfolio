// Simple helper around the Web Share API
export const canShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

// Shares the provided text along with optional title and url
export const share = async (
  text: string,
  title?: string,
  url?: string
): Promise<boolean> => {
  if (!canShare()) return false;
  try {
    await navigator.share({ text, title, url: url ?? window.location.href });
    return true;
  } catch {
    return false;
  }
};

export default share;
