const THUMBNAIL_CACHE = new Map();

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'jpe',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
  'heic',
  'heif',
  'avif',
]);

const VIDEO_EXTENSIONS = new Set(['mp4', 'm4v', 'mov', 'avi', 'mkv', 'webm', 'mpg', 'mpeg']);

const PDF_EXTENSIONS = new Set(['pdf']);

function getExtension(name) {
  if (!name) return '';
  const lower = name.toLowerCase();
  const parts = lower.split('.');
  if (parts.length <= 1) return '';
  // handle compound extensions like tar.gz
  for (let i = 1; i < parts.length; i++) {
    const candidate = parts.slice(i).join('.');
    if (PDF_EXTENSIONS.has(candidate) || VIDEO_EXTENSIONS.has(candidate) || IMAGE_EXTENSIONS.has(candidate)) {
      return candidate;
    }
  }
  return parts.pop();
}

function isAbortError(error) {
  return error?.name === 'AbortError';
}

async function generateImageThumbnail(file) {
  const url = URL.createObjectURL(file);
  return {
    kind: 'image',
    url,
    revoke: () => URL.revokeObjectURL(url),
    mime: file.type,
  };
}

async function generateVideoThumbnail(file, signal) {
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.src = url;

    const cleanup = () => {
      video.remove();
      URL.revokeObjectURL(url);
      if (signal) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    const fail = (error) => {
      cleanup();
      reject(error);
    };

    const onAbort = () => fail(new DOMException('Aborted', 'AbortError'));
    if (signal) {
      if (signal.aborted) {
        cleanup();
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    video.addEventListener('error', () => fail(new Error('Unable to load video')));

    video.addEventListener('loadeddata', () => {
      const seekTo = Math.min(1, Math.max(video.duration * 0.1, 0));
      const canvas = document.createElement('canvas');
      const drawFrame = () => {
        try {
          const ratio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
          const width = 180;
          const height = Math.round(width / ratio);
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas 2D context unavailable');
          context.drawImage(video, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          cleanup();
          resolve({ kind: 'video', url: dataUrl, mime: file.type });
        } catch (error) {
          fail(error);
        }
      };

      if (Number.isFinite(seekTo) && seekTo > 0) {
        const handleSeek = () => {
          video.removeEventListener('seeked', handleSeek);
          drawFrame();
        };
        video.addEventListener('seeked', handleSeek);
        try {
          video.currentTime = seekTo;
        } catch (error) {
          fail(error);
        }
      } else {
        drawFrame();
      }
    });
  });
}

async function generatePdfThumbnail(file, signal) {
  const pdfjsLib = await import('pdfjs-dist');
  if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
  const data = await file.arrayBuffer();
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const targetWidth = 180;
  const scale = targetWidth / viewport.width;
  const canvas = document.createElement('canvas');
  const view = page.getViewport({ scale });
  canvas.width = view.width;
  canvas.height = view.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D context unavailable');
  const renderTask = page.render({ canvasContext: context, viewport: view, canvas });
  if (signal?.aborted) {
    renderTask.cancel();
    throw new DOMException('Aborted', 'AbortError');
  }
  await renderTask.promise;
  return { kind: 'pdf', url: canvas.toDataURL('image/png'), mime: file.type };
}

export async function generateThumbnail(handle, options = {}) {
  if (!handle || typeof handle.getFile !== 'function') return null;
  if (THUMBNAIL_CACHE.has(handle)) {
    const cached = THUMBNAIL_CACHE.get(handle);
    if (cached && typeof cached.then !== 'function') {
      return cached;
    }
    return cached;
  }

  const { signal, file: providedFile, allowVideo = true, allowPdf = true } = options;

  const loader = (async () => {
    const file = providedFile || (await handle.getFile());
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const mime = file.type;
    const ext = getExtension(file.name || handle.name || '');

    if (mime.startsWith('image/') || IMAGE_EXTENSIONS.has(ext)) {
      const result = await generateImageThumbnail(file);
      if (signal?.aborted) {
        result.revoke?.();
        throw new DOMException('Aborted', 'AbortError');
      }
      return result;
    }

    if (allowVideo && (mime.startsWith('video/') || VIDEO_EXTENSIONS.has(ext))) {
      return await generateVideoThumbnail(file, signal);
    }

    if (allowPdf && (mime === 'application/pdf' || PDF_EXTENSIONS.has(ext))) {
      const result = await generatePdfThumbnail(file, signal);
      if (signal?.aborted) {
        result.revoke?.();
        throw new DOMException('Aborted', 'AbortError');
      }
      return result;
    }

    return { kind: 'icon', mime };
  })();

  THUMBNAIL_CACHE.set(handle, loader);

  try {
    const result = await loader;
    THUMBNAIL_CACHE.set(handle, result);
    return result;
  } catch (error) {
    if (!isAbortError(error)) {
      THUMBNAIL_CACHE.delete(handle);
    }
    if (isAbortError(error)) return null;
    throw error;
  }
}

export function clearThumbnailCache() {
  for (const value of THUMBNAIL_CACHE.values()) {
    if (value && typeof value === 'object' && 'then' in value && typeof value.then === 'function') {
      continue;
    }
    if (value && typeof value === 'object' && 'revoke' in value && typeof value.revoke === 'function') {
      value.revoke();
    }
  }
  THUMBNAIL_CACHE.clear();
}
