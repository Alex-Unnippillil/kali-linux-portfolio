export type ClipboardFailureReason =
  | 'unsupported'
  | 'permission-denied'
  | 'unknown';

export type ClipboardResult =
  | { success: true }
  | { success: false; reason: ClipboardFailureReason; error?: Error };

type IconFormat = 'original' | 'png';

interface IconRequestMessage {
  id: number;
  url: string;
  format: IconFormat;
}

interface IconResponseMessage {
  id: number;
  success: boolean;
  error?: string;
  blob?: Blob;
}

const isPermissionError = (error: unknown): error is DOMException => {
  if (!(error instanceof DOMException)) return false;
  return error.name === 'NotAllowedError' || error.name === 'SecurityError';
};

const createSuccess = (): ClipboardResult => ({ success: true });

const createFailure = (
  reason: ClipboardFailureReason,
  error?: Error,
): ClipboardResult => ({ success: false, reason, error });

const copyUsingTextarea = (text: string): ClipboardResult => {
  if (typeof document === 'undefined') {
    return createFailure('unsupported');
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful ? createSuccess() : createFailure('unknown');
  } catch (error) {
    return createFailure('unknown', error as Error);
  }
};

export const copyTextDetailed = async (text: string): Promise<ClipboardResult> => {
  if (typeof navigator === 'undefined') {
    return createFailure('unsupported');
  }

  const clipboard = navigator.clipboard;

  if (clipboard?.writeText) {
    try {
      await clipboard.writeText(text);
      return createSuccess();
    } catch (error) {
      if (isPermissionError(error)) {
        return createFailure('permission-denied', error as Error);
      }
      return createFailure('unknown', error as Error);
    }
  }

  return copyUsingTextarea(text);
};

type PendingRequest = {
  resolve: (blob: Blob) => void;
  reject: (error: Error) => void;
};

let iconWorker: Worker | null = null;
let nextRequestId = 1;
const pendingRequests = new Map<number, PendingRequest>();

const resolveUrl = (input: string): string => {
  try {
    const base = typeof location !== 'undefined' ? location.href : 'http://localhost/';
    return new URL(input, base).toString();
  } catch {
    return input;
  }
};

const ensureIconWorker = (): Worker | null => {
  if (iconWorker || typeof window === 'undefined') return iconWorker;
  if (typeof Worker !== 'function') return null;

  try {
    iconWorker = new Worker(
      new URL('../workers/iconClipboard.worker.ts', import.meta.url),
    );
    iconWorker.onmessage = (event: MessageEvent<IconResponseMessage>) => {
      const { id, success, blob, error } = event.data;
      const pending = pendingRequests.get(id);
      if (!pending) return;
      pendingRequests.delete(id);
      if (success && blob) {
        pending.resolve(blob);
      } else {
        pending.reject(new Error(error || 'Icon worker failed'));
      }
    };
    iconWorker.onerror = (event) => {
      pendingRequests.forEach(({ reject }) => {
        reject(new Error(event.message || 'Icon worker encountered an error'));
      });
      pendingRequests.clear();
    };
  } catch {
    iconWorker = null;
  }

  return iconWorker;
};

const fetchIconOnMainThread = async (
  url: string,
  format: IconFormat,
): Promise<Blob> => {
  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is not available');
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load icon: ${response.status}`);
  }

  const blob = await response.blob();
  if (format === 'original') {
    return blob;
  }

  if (typeof document === 'undefined') {
    return blob;
  }

  const imageUrl = URL.createObjectURL(blob);
  return new Promise<Blob>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width || 1;
        canvas.height = image.height || 1;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        context.drawImage(image, 0, 0);
        const toBlob = (canvas as any).toBlob?.bind(canvas);
        if (typeof toBlob === 'function') {
          toBlob((png: Blob | null) => {
            if (png) resolve(png);
            else reject(new Error('Failed to convert icon to PNG'));
          }, 'image/png');
        } else if (typeof (canvas as any).convertToBlob === 'function') {
          (canvas as any)
            .convertToBlob({ type: 'image/png' })
            .then((png: Blob) => resolve(png))
            .catch((error: Error) => reject(error));
        } else {
          reject(new Error('Canvas toBlob not supported'));
        }
      } catch (error) {
        reject(error as Error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Unable to load icon for conversion'));
    };
    image.src = imageUrl;
  });
};

const requestIconBlob = async (url: string, format: IconFormat): Promise<Blob> => {
  const absoluteUrl = resolveUrl(url);
  const worker = ensureIconWorker();

  if (!worker) {
    return fetchIconOnMainThread(absoluteUrl, format);
  }

  const id = nextRequestId++;

  return new Promise<Blob>((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ id, url: absoluteUrl, format } as IconRequestMessage);
  });
};

const copyImageBlobs = async (
  urls: string[],
  format: IconFormat,
): Promise<ClipboardResult> => {
  if (!urls.length) {
    return createSuccess();
  }

  if (typeof navigator === 'undefined') {
    return createFailure('unsupported');
  }

  const clipboard = navigator.clipboard as
    | (Clipboard & { write?: (items: ClipboardItem[]) => Promise<void> })
    | undefined;

  if (!clipboard || typeof clipboard.write !== 'function') {
    return createFailure('unsupported');
  }

  if (typeof ClipboardItem === 'undefined') {
    return createFailure('unsupported');
  }

  try {
    const blobs = await Promise.all(urls.map((url) => requestIconBlob(url, format)));
    const items = blobs.map((blob) => {
      const type = format === 'png' ? 'image/png' : blob.type || 'image/png';
      return new ClipboardItem({ [type]: blob });
    });
    await clipboard.write(items);
    return createSuccess();
  } catch (error) {
    if (isPermissionError(error)) {
      return createFailure('permission-denied', error as Error);
    }
    return createFailure('unknown', error as Error);
  }
};

export const copyPathsToClipboard = async (
  paths: string[],
): Promise<ClipboardResult> => copyTextDetailed(paths.join('\n'));

export const copyIconsToClipboard = async (
  urls: string[],
): Promise<ClipboardResult> => copyImageBlobs(urls, 'original');

export const copyIconsAsPng = async (
  urls: string[],
): Promise<ClipboardResult> => copyImageBlobs(urls, 'png');

export const copyToClipboard = async (text: string): Promise<boolean> => {
  const result = await copyTextDetailed(text);
  return result.success;
};

export default copyToClipboard;
