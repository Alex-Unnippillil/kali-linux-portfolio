// Enhanced helper around the Web Share API that gracefully handles
// feature detection, file payloads, and contextual error reasons.

export type ShareFileInput =
  | File
  | {
      blob: Blob;
      name: string;
      type?: string;
    };

export interface ShareRequest {
  text?: string;
  title?: string;
  url?: string;
  files?: ShareFileInput[];
}

export type ShareFailureReason =
  | 'unsupported'
  | 'unsupported-payload'
  | 'permission-denied'
  | 'cancelled'
  | 'invalid'
  | 'unknown';

export interface ShareResult {
  ok: boolean;
  reason?: ShareFailureReason;
  error?: unknown;
  context?: string;
}

export interface ShareOptions {
  /**
   * Optional string that explains why the share was triggered. Returned as-is
   * in the {@link ShareResult} so callers can track which UI attempted the
   * share.
   */
  reason?: string;
}

const isNavigatorAvailable = () => typeof navigator !== 'undefined';

const normaliseFile = (input: ShareFileInput): File | undefined => {
  if (typeof File !== 'undefined' && input instanceof File) return input;
  if ('blob' in input) {
    const { blob, name, type } = input;
    if (typeof File === 'function') {
      try {
        return new File([blob], name, { type: type ?? blob.type });
      } catch {
        // ignore constructor failure and fall through to Blob coercion
      }
    }
    try {
      const coerced = type ? new Blob([blob], { type }) : blob;
      (coerced as File).name = name;
      return coerced as File;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

const cleanShareData = (data: ShareRequest): ShareData => {
  const shareData: ShareData = {};
  if (data.text) shareData.text = data.text;
  if (data.title) shareData.title = data.title;
  if (data.url) shareData.url = data.url;
  if (data.files?.length) {
    const files = data.files
      .map((file) => normaliseFile(file))
      .filter((file): file is File => Boolean(file));
    if (files.length) {
      shareData.files = files;
    }
  }
  return shareData;
};

const determineFailureReason = (error: unknown): ShareFailureReason => {
  if (error instanceof DOMException) {
    if (error.name === 'AbortError') return 'cancelled';
    if (error.name === 'NotAllowedError') return 'permission-denied';
    if (error.name === 'TypeError') return 'invalid';
  }
  if ((error as { name?: string })?.name === 'AbortError') return 'cancelled';
  return 'unknown';
};

export const canShare = (data?: ShareRequest): boolean => {
  if (!isNavigatorAvailable() || typeof navigator.share !== 'function') {
    return false;
  }

  if (!data?.files?.length) return true;

  if (typeof navigator.canShare !== 'function') {
    return false;
  }

  try {
    const shareData = cleanShareData({ files: data.files });
    if (!shareData.files?.length) return false;
    return navigator.canShare(shareData);
  } catch {
    return false;
  }
};

export const share = async (
  data: ShareRequest,
  options: ShareOptions = {}
): Promise<ShareResult> => {
  const shareData = cleanShareData(data);
  const context = options.reason;

  if (!isNavigatorAvailable() || typeof navigator.share !== 'function') {
    return { ok: false, reason: 'unsupported', context };
  }

  if (shareData.files?.length && typeof navigator.canShare === 'function') {
    try {
      if (!navigator.canShare({ files: shareData.files })) {
        return { ok: false, reason: 'unsupported-payload', context };
      }
    } catch {
      return { ok: false, reason: 'unsupported-payload', context };
    }
  }

  try {
    await navigator.share(shareData);
    return { ok: true, context };
  } catch (error) {
    return { ok: false, reason: determineFailureReason(error), error, context };
  }
};

export default share;
