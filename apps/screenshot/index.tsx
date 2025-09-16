'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

const CAPTURE_LABELS = {
  desktop: 'Entire desktop',
  window: 'Active window',
} as const;

type CaptureMode = keyof typeof CAPTURE_LABELS;
type CopyState = 'idle' | 'copying' | 'copied' | 'error';

function getConstraints(mode: CaptureMode): DisplayMediaStreamConstraints {
  const videoConstraints: Record<string, unknown> = {
    logicalSurface: true,
  };

  if (mode === 'desktop') {
    videoConstraints.displaySurface = 'monitor';
  } else {
    videoConstraints.displaySurface = 'window';
    videoConstraints.preferCurrentTab = true;
  }

  return {
    audio: false,
    video: videoConstraints as MediaTrackConstraints,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to encode canvas to PNG.'));
      }
    }, 'image/png');
  });
}

const ScreenshotApp = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const flashTimer = useRef<number>();

  const [mode, setMode] = useState<CaptureMode>('desktop');
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [status, setStatus] = useState<string | null>(
    'Choose a capture mode and press "Capture screenshot".',
  );
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const [clipboardSupported, setClipboardSupported] = useState(false);
  const [captureSupported, setCaptureSupported] = useState(true);
  const [flash, setFlash] = useState(false);

  const prefersReducedMotion = usePrefersReducedMotion();
  const baseId = useId();

  const cleanupStream = useCallback(() => {
    if (flashTimer.current) {
      window.clearTimeout(flashTimer.current);
      flashTimer.current = undefined;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof window !== 'undefined') {
      const hasCapture = typeof navigator.mediaDevices?.getDisplayMedia === 'function';
      const hasClipboard =
        typeof navigator.clipboard?.write === 'function' && 'ClipboardItem' in window;
      setCaptureSupported(hasCapture);
      setClipboardSupported(hasClipboard);
      if (!hasCapture) {
        setError('Screen capture is not supported in this browser.');
        setStatus(null);
      }
    }
  }, []);

  useEffect(
    () => () => {
      cleanupStream();
    },
    [cleanupStream],
  );

  useEffect(() => {
    if (copyState === 'copied' && typeof window !== 'undefined') {
      const timer = window.setTimeout(() => setCopyState('idle'), 2000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [copyState]);

  const aspectRatio = useMemo(() => {
    if (!dimensions) return '16 / 9';
    return `${dimensions.width} / ${dimensions.height}`;
  }, [dimensions]);

  const handleCapture = useCallback(async () => {
    if (isCapturing) return;
    if (typeof navigator === 'undefined' || typeof window === 'undefined') return;

    const getDisplay = navigator.mediaDevices?.getDisplayMedia;
    if (typeof getDisplay !== 'function') {
      setError('Screen capture is not supported in this browser.');
      return;
    }

    setIsCapturing(true);
    setError(null);
    setStatus('Awaiting capture confirmation…');
    setCopyState('idle');

    try {
      const constraints = getConstraints(mode);
      const stream = await getDisplay(constraints);
      streamRef.current = stream;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        throw new Error('Capture elements are not ready.');
      }

      video.srcObject = stream;
      video.muted = true;

      const onLoaded = new Promise<void>((resolve, reject) => {
        const handleLoaded = () => {
          video.removeEventListener('loadedmetadata', handleLoaded);
          video.removeEventListener('error', handleError);
          resolve();
        };
        const handleError = () => {
          video.removeEventListener('loadedmetadata', handleLoaded);
          video.removeEventListener('error', handleError);
          reject(new Error('Unable to read captured stream.'));
        };

        if (video.readyState >= 1) {
          resolve();
        } else {
          video.addEventListener('loadedmetadata', handleLoaded, { once: true });
          video.addEventListener('error', handleError, { once: true });
        }
      });

      const playPromise = video.play();
      if (playPromise) {
        await playPromise.catch(() => undefined);
      }

      await onLoaded;

      const width = video.videoWidth || stream.getVideoTracks()[0]?.getSettings().width;
      const height = video.videoHeight || stream.getVideoTracks()[0]?.getSettings().height;

      if (!width || !height) {
        throw new Error('Unable to determine capture dimensions.');
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Unable to draw to canvas.');
      }

      ctx.drawImage(video, 0, 0, width, height);
      setDimensions({ width, height });
      setHasImage(true);
      setStatus('Screenshot captured.');

      if (!prefersReducedMotion) {
        setFlash(true);
        if (flashTimer.current) {
          window.clearTimeout(flashTimer.current);
        }
        flashTimer.current = window.setTimeout(() => {
          setFlash(false);
          flashTimer.current = undefined;
        }, 240);
      } else {
        setFlash(false);
      }
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Screen capture permission was denied.');
        } else if (err.name === 'AbortError') {
          setError('Screen capture was cancelled.');
        } else {
          setError('Unable to capture the screen. Please try again.');
        }
      } else {
        setError('Unable to capture the screen. Please try again.');
      }
      setStatus(null);
    } finally {
      cleanupStream();
      setIsCapturing(false);
    }
  }, [cleanupStream, flashTimer, isCapturing, mode, prefersReducedMotion]);

  const clearImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasImage(false);
    setDimensions(null);
    setStatus('Previous capture cleared.');
    setCopyState('idle');
    setError(null);
  }, []);

  const copyImage = useCallback(async () => {
    if (!clipboardSupported || !hasImage) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setCopyState('copying');

    try {
      const blob = await canvasToBlob(canvas);
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      setCopyState('copied');
      setStatus('Screenshot copied to clipboard.');
      setError(null);
    } catch (err) {
      console.error('Failed to copy screenshot', err);
      setCopyState('error');
      setError('Copy failed. Your browser may not allow image clipboard access.');
      setStatus(null);
    }
  }, [clipboardSupported, hasImage]);

  const downloadImage = useCallback(() => {
    if (!hasImage) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `screenshot-${mode}-${Date.now()}.png`;
    link.click();
    setStatus('Screenshot download started.');
    setError(null);
  }, [hasImage, mode]);

  const captureDisabled = isCapturing || !captureSupported;
  const copyDisabled = !hasImage || !clipboardSupported || copyState === 'copying';

  return (
    <div className="h-full overflow-auto bg-ub-cool-grey p-4 text-white">
      <div className="space-y-4 max-w-4xl mx-auto">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Screenshot</h1>
          <p className="text-sm text-gray-300">
            Capture an image of your entire desktop or a single window. All processing happens in your
            browser.
          </p>
        </header>

        <fieldset className="rounded-md border border-gray-600 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-300">
            Capture target
          </legend>
          <div className="mt-2 flex flex-wrap gap-4">
            {(Object.keys(CAPTURE_LABELS) as CaptureMode[]).map((option) => {
              const optionId = `${baseId}-${option}`;
              return (
                <label key={option} htmlFor={optionId} className="flex items-center gap-2 text-sm">
                  <input
                    id={optionId}
                    type="radio"
                    name="screenshot-mode"
                    value={option}
                    checked={mode === option}
                    onChange={() => setMode(option)}
                    className="h-4 w-4"
                  />
                  <span>{CAPTURE_LABELS[option]}</span>
                </label>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            The browser will still prompt you to pick the exact screen or window.
          </p>
        </fieldset>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCapture}
            disabled={captureDisabled}
            className={`rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring ${
              captureDisabled ? 'cursor-not-allowed opacity-60' : ''
            }`}
          >
            {isCapturing ? 'Capturing…' : 'Capture screenshot'}
          </button>
          <button
            type="button"
            onClick={clearImage}
            disabled={!hasImage}
            className={`rounded border border-gray-500 px-3 py-2 text-sm text-gray-100 hover:bg-gray-700 focus:outline-none focus:ring ${
              !hasImage ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            Clear
          </button>
        </div>

        <div className="space-y-2">
          <div
            className={`relative flex max-h-[65vh] w-full items-center justify-center overflow-hidden rounded-lg border border-gray-700 bg-black/40 ${
              prefersReducedMotion ? '' : 'transition-all duration-200'
            } ${flash ? 'ring-4 ring-blue-400/70' : ''}`}
            style={{ aspectRatio }}
          >
            <canvas
              ref={canvasRef}
              aria-label={hasImage ? 'Screenshot preview' : 'Screenshot preview placeholder'}
              role="img"
              className="h-full w-full"
            />
            {!hasImage && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-sm text-gray-400">
                <p>No capture yet.</p>
                <p className="text-xs text-gray-500">
                  Use the controls above to grab a screenshot.
                </p>
              </div>
            )}
            <div
              className={`pointer-events-none absolute inset-0 bg-white ${
                prefersReducedMotion ? 'opacity-0' : 'transition-opacity duration-200'
              } ${flash ? 'opacity-40' : 'opacity-0'}`}
              aria-hidden="true"
            />
          </div>
          {hasImage && dimensions && (
            <p className="text-xs text-gray-400">
              Resolution: {dimensions.width} × {dimensions.height} pixels
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyImage}
            disabled={copyDisabled}
            className={`rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 focus:outline-none focus:ring ${
              copyDisabled ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            {copyState === 'copying'
              ? 'Copying…'
              : copyState === 'copied'
              ? 'Copied!'
              : 'Copy to clipboard'}
          </button>
          <button
            type="button"
            onClick={downloadImage}
            disabled={!hasImage}
            className={`rounded bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 focus:outline-none focus:ring ${
              !hasImage ? 'cursor-not-allowed opacity-50' : ''
            }`}
          >
            Download PNG
          </button>
        </div>

        {status && <p className="text-sm text-emerald-300">{status}</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!clipboardSupported && (
          <p className="text-xs text-amber-300">
            Copying images to the clipboard may not be available in this browser. Download the PNG instead.
          </p>
        )}
      </div>
      <video ref={videoRef} className="hidden" aria-hidden="true" />
    </div>
  );
};

export default ScreenshotApp;

