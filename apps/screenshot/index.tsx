'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

type CaptureMode = 'screen' | 'window';
type ClipboardPermissionName = 'clipboard-read' | 'clipboard-write';

const waitForVideoReady = (video: HTMLVideoElement) =>
  new Promise<void>((resolve) => {
    if (video.readyState >= 2) {
      resolve();
      return;
    }
    const onLoaded = () => {
      video.removeEventListener('loadeddata', onLoaded);
      resolve();
    };
    video.addEventListener('loadeddata', onLoaded);
  });

const queryClipboardPermission = async (
  name: ClipboardPermissionName,
): Promise<PermissionState | 'unknown'> => {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unknown';
  }
  try {
    const result = await navigator.permissions.query({ name } as PermissionDescriptor);
    return result.state;
  } catch {
    return 'unknown';
  }
};

const buildVideoConstraints = (mode: CaptureMode): MediaTrackConstraints => {
  const constraints: MediaTrackConstraints = {};
  const extended = constraints as MediaTrackConstraints & {
    displaySurface?: 'monitor' | 'window';
    logicalSurface?: boolean;
    preferCurrentTab?: boolean;
    cursor?: 'always' | 'motion' | 'never';
  };

  extended.logicalSurface = true;
  extended.cursor = 'always';
  if (mode === 'screen') {
    extended.displaySurface = 'monitor';
  } else {
    extended.displaySurface = 'window';
    extended.preferCurrentTab = true;
  }

  return constraints;
};

const ScreenshotApp = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<CaptureMode>('screen');
  const [supported, setSupported] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [copying, setCopying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [clipboardSupported, setClipboardSupported] = useState(false);

  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    setSupported(
      typeof navigator !== 'undefined' &&
        Boolean(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
    );
    setClipboardSupported(
      typeof navigator !== 'undefined' &&
        typeof window !== 'undefined' &&
        Boolean(navigator.clipboard?.write) &&
        'ClipboardItem' in window,
    );

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!flash || prefersReducedMotion) return;
    const timeout = window.setTimeout(() => setFlash(false), 450);
    return () => window.clearTimeout(timeout);
  }, [flash, prefersReducedMotion]);

  useEffect(() => {
    if (!status) return;
    const timeout = window.setTimeout(() => setStatus(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const capture = useCallback(async () => {
    setError(null);
    setStatus(null);

    if (!supported || typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setError('Screen capture is not supported in this browser.');
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) {
      setError('Canvas preview is unavailable.');
      return;
    }

    setCapturing(true);
    setFlash(false);

    try {
      const options = {
        video: buildVideoConstraints(mode),
        audio: false,
      } as MediaStreamConstraints;

      const stream = await navigator.mediaDevices.getDisplayMedia(options as any);
      streamRef.current = stream;

      const [track] = stream.getVideoTracks();
      if (!track) {
        throw new Error('No video track available from capture.');
      }

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      await video.play().catch(() => undefined);
      await waitForVideoReady(video);

      const settings = track.getSettings();
      const width = settings.width ?? video.videoWidth ?? 0;
      const height = settings.height ?? video.videoHeight ?? 0;

      if (width === 0 || height === 0) {
        throw new Error('Unable to determine capture dimensions.');
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas is not supported in this environment.');
      }

      ctx.drawImage(video, 0, 0, width, height);
      setHasImage(true);
      if (!prefersReducedMotion) {
        setFlash(true);
      }
      setStatus('Screenshot captured.');
    } catch (err) {
      if ((err as DOMException)?.name === 'NotAllowedError') {
        setError('Capture was cancelled or blocked by the browser.');
      } else if ((err as DOMException)?.name === 'NotFoundError') {
        setError('No capture source was available.');
      } else {
        setError('Unable to capture the requested surface.');
        console.error(err);
      }
    } finally {
      setCapturing(false);
      const stream = streamRef.current;
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      stream?.getTracks().forEach((track) => track.stop());
    }
  }, [mode, prefersReducedMotion, supported]);

  const copyToClipboard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage || !clipboardSupported) return;

    setCopying(true);
    setError(null);
    setStatus(null);

    try {
      const permission = await queryClipboardPermission('clipboard-write');
      if (permission === 'denied') {
        setError('Clipboard access has been denied.');
        return;
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png'),
      );
      if (!blob) {
        throw new Error('Failed to encode screenshot.');
      }

      const ClipboardItemCtor = (window as typeof window & { ClipboardItem?: any }).ClipboardItem;
      if (!ClipboardItemCtor) {
        throw new Error('Clipboard items are not supported in this browser.');
      }

      await navigator.clipboard.write([new ClipboardItemCtor({ [blob.type]: blob })]);
      setStatus('Screenshot copied to clipboard.');
    } catch (err) {
      if ((err as DOMException)?.name === 'NotAllowedError') {
        setError('Clipboard permission was denied.');
      } else {
        setError('Unable to copy the screenshot to the clipboard.');
        console.error(err);
      }
    } finally {
      setCopying(false);
    }
  }, [clipboardSupported, hasImage]);

  const downloadImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) return;

    setSaving(true);
    setError(null);
    setStatus(null);

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/png'),
      );
      if (!blob) {
        throw new Error('Failed to encode screenshot for download.');
      }

      const fileName = `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;

      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const handle = await (window as typeof window & {
            showSaveFilePicker?: (options?: unknown) => Promise<any>;
          }).showSaveFilePicker?.({
            suggestedName: fileName,
            types: [
              {
                description: 'PNG image',
                accept: { 'image/png': ['.png'] },
              },
            ],
          });

          if (handle) {
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            setStatus('Screenshot saved.');
            return;
          }
        } catch (err) {
          if ((err as DOMException)?.name === 'AbortError') {
            setStatus('Download cancelled.');
            return;
          }
          console.warn('Save file picker failed, falling back to download link.', err);
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus('Screenshot downloaded.');
    } catch (err) {
      setError('Unable to download the screenshot.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [hasImage]);

  const interactiveClasses = prefersReducedMotion
    ? 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange'
    : 'transition-transform duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ub-orange hover:-translate-y-0.5 active:translate-y-0';

  const previewRing = flash ? 'ring-4 ring-ub-orange/60 shadow-lg shadow-ub-orange/20' : 'ring-1 ring-white/10';

  return (
    <div className="flex h-full flex-col gap-4 bg-ub-cool-grey p-4 text-white">
      <div>
        <h1 className="text-lg font-semibold">Screenshot Tool</h1>
        <p className="mt-1 text-sm text-white/70">
          Capture the full desktop or the active window and preview it instantly.
        </p>
      </div>

      {!supported ? (
        <div className="rounded border border-white/10 bg-black/40 p-4 text-sm">
          Screen capture is not available in this environment.
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,260px)_1fr]">
          <section className="space-y-4 rounded border border-white/10 bg-black/30 p-4">
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-white/80">Capture area</legend>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="capture-mode"
                  value="screen"
                  checked={mode === 'screen'}
                  onChange={() => setMode('screen')}
                  className="mt-1"
                />
                <span className="text-sm leading-tight">
                  <span className="font-semibold">Full desktop</span>
                  <br />
                  Capture the entire monitor. You can choose which screen to share when prompted.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  name="capture-mode"
                  value="window"
                  checked={mode === 'window'}
                  onChange={() => setMode('window')}
                  className="mt-1"
                />
                <span className="text-sm leading-tight">
                  <span className="font-semibold">Active window</span>
                  <br />
                  Focus on a single application window for a cleaner screenshot.
                </span>
              </label>
            </fieldset>

            <button
              type="button"
              onClick={capture}
              disabled={capturing}
              className={`flex w-full items-center justify-center gap-2 rounded bg-ub-dracula px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-ub-dracula/60 ${interactiveClasses}`}
            >
              {capturing && (
                <span
                  className={`inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent ${
                    prefersReducedMotion ? '' : 'animate-spin'
                  }`}
                  aria-hidden
                />
              )}
              {capturing ? 'Capturing…' : 'Capture screenshot'}
            </button>
            <p className="text-xs text-white/60">
              Your browser will ask for permission before sharing the selected surface. Nothing leaves
              this device.
            </p>
          </section>

          <section className="flex min-h-0 flex-col gap-4">
            <div
              className={`relative flex min-h-[200px] flex-1 items-center justify-center overflow-hidden rounded bg-black/40 ${
                prefersReducedMotion ? 'border border-white/15' : previewRing
              }`}
            >
              <canvas
                ref={canvasRef}
                className={`max-h-full max-w-full object-contain ${
                  prefersReducedMotion ? '' : 'transition-opacity duration-300'
                } ${hasImage ? 'opacity-100' : 'opacity-40'}`}
                aria-label="Screenshot preview"
              />
              {!hasImage && (
                <p className="px-4 text-center text-sm text-white/60">
                  Click “Capture screenshot” to see the preview here.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyToClipboard}
                disabled={!hasImage || copying || !clipboardSupported}
                className={`flex items-center gap-2 rounded bg-ub-ylw px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:bg-ub-ylw/50 ${interactiveClasses}`}
              >
                {copying && (
                  <span
                    className={`inline-block h-4 w-4 rounded-full border-2 border-black border-t-transparent ${
                      prefersReducedMotion ? '' : 'animate-spin'
                    }`}
                    aria-hidden
                  />
                )}
                Copy to clipboard
              </button>
              <button
                type="button"
                onClick={downloadImage}
                disabled={!hasImage || saving}
                className={`flex items-center gap-2 rounded bg-white/10 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-white/5 ${interactiveClasses}`}
              >
                {saving && (
                  <span
                    className={`inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent ${
                      prefersReducedMotion ? '' : 'animate-spin'
                    }`}
                    aria-hidden
                  />
                )}
                Download PNG
              </button>
            </div>

            <div className="space-y-1 text-sm" aria-live="polite" aria-atomic="true">
              {status && <p className="text-emerald-300">{status}</p>}
              {error && (
                <p className="text-red-300" role="alert">
                  {error}
                </p>
              )}
              {!clipboardSupported && (
                <p className="text-white/60">
                  Clipboard copying is unavailable in this browser. Download the PNG instead.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      <video ref={videoRef} className="hidden" playsInline muted />
    </div>
  );
};

export default ScreenshotApp;
