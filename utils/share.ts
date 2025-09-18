export interface ShareOptions {
  text?: string;
  title?: string;
  url?: string;
  files?: File[];
}

// Simple helper around the Web Share API
export const canShare = (options?: ShareOptions): boolean => {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false;
  }

  if (options?.files && options.files.length > 0) {
    const canShareFn = (navigator as Navigator & { canShare?: (data: ShareData) => boolean }).canShare;
    if (typeof canShareFn !== 'function') {
      return false;
    }

    try {
      return canShareFn({ files: options.files });
    } catch {
      return false;
    }
  }

  return true;
};

const normalizeOptions = (
  dataOrText: string | ShareOptions,
  title?: string,
  url?: string,
): ShareOptions => {
  if (typeof dataOrText === 'string') {
    return { text: dataOrText, title, url };
  }
  return dataOrText;
};

// Shares the provided payload (text, files, etc.) via the Web Share API
export const share = async (
  dataOrText: string | ShareOptions,
  title?: string,
  url?: string,
): Promise<boolean> => {
  const options = normalizeOptions(dataOrText, title, url);
  if (!canShare(options)) return false;

  const shareData: ShareData = {};
  if (options.text) shareData.text = options.text;
  if (options.title) shareData.title = options.title;
  if (options.files && options.files.length > 0) shareData.files = options.files;

  if (options.url !== undefined) {
    shareData.url = options.url;
  } else if (typeof window !== 'undefined') {
    shareData.url = window.location.href;
  }

  try {
    await navigator.share(shareData);
    return true;
  } catch {
    return false;
  }
};

export default share;
