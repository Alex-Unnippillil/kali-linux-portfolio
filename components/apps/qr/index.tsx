'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';

type Mode = 'scan' | 'generate';
type ErrorLevel = 'L' | 'M' | 'Q' | 'H';
type EncodeOptions = NonNullable<Parameters<typeof QRCode.toDataURL>[1]>;

interface EncodeResponse {
  png: string;
  svg: string;
}

const errorLevels: ErrorLevel[] = ['L', 'M', 'Q', 'H'];

const QRTool: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const [mode, setMode] = useState<Mode>('scan');

  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [torch, setTorch] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [preview, setPreview] = useState('');

  const [genText, setGenText] = useState('');
  const [genLevel, setGenLevel] = useState<ErrorLevel>('M');
  const [genInvert, setGenInvert] = useState(false);
  const [genPng, setGenPng] = useState('');
  const [genSvg, setGenSvg] = useState('');
  const [genError, setGenError] = useState('');

  const stopCamera = useCallback(() => {
    if (scanFrameRef.current !== null) {
      cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    trackRef.current = null;
    setTorch(false);
    setTorchAvailable(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (mode !== 'scan') {
      stopCamera();
      return;
    }

    let active = true;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API not supported');
        return;
      }

      setError('');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        trackRef.current = stream.getVideoTracks()[0] || null;

        const capabilities = (trackRef.current as any)?.getCapabilities?.();
        setTorchAvailable(Boolean(capabilities?.torch));

        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play();
        }

        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const scan = async () => {
            if (!active || mode !== 'scan') return;
            try {
              const target = videoRef.current;
              if (target) {
                const codes = await detector.detect(target);
                if (codes[0]?.rawValue) setResult(codes[0].rawValue);
              }
            } catch {
              /* ignore */
            }
            if (active) scanFrameRef.current = requestAnimationFrame(scan);
          };
          scan();
        } else {
          const jsQR = (await import('jsqr')).default;
          const scanFrame = async () => {
            if (!active || mode !== 'scan') return;
            try {
              const videoElLocal = videoRef.current;
              if (videoElLocal && videoElLocal.readyState === videoElLocal.HAVE_ENOUGH_DATA) {
                const canvas = document.createElement('canvas');
                canvas.width = videoElLocal.videoWidth;
                canvas.height = videoElLocal.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(videoElLocal, 0, 0, canvas.width, canvas.height);
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const code = jsQR(imageData.data, canvas.width, canvas.height);
                  if (code?.data) setResult(code.data);
                }
              }
            } catch {
              /* ignore frame errors */
            }
            if (active) scanFrameRef.current = requestAnimationFrame(scanFrame);
          };
          scanFrame();
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError('Camera access was denied');
        } else {
          setError('Could not start camera');
        }
      }
    };

    start();

    return () => {
      active = false;
      stopCamera();
    };
  }, [facing, mode, stopCamera]);

  useEffect(() => {
    if (mode !== 'scan') return;
    const track = trackRef.current as any;
    if (!track || !torchAvailable) return;
    track.applyConstraints({ advanced: [{ torch }] }).catch(() => {});
  }, [mode, torch, torchAvailable]);

  useEffect(() => {
    if (result) {
      QRCode.toDataURL(result, { width: 128 })
        .then(setPreview)
        .catch(() => setPreview(''));
    } else {
      setPreview('');
    }
  }, [result]);

  const initWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../../../workers/qrEncode.worker.ts', import.meta.url),
      );
    }
    return workerRef.current;
  }, []);

  const encodeQr = useCallback(
    (text: string, opts: EncodeOptions) =>
      new Promise<EncodeResponse>((resolve, reject) => {
        const worker = initWorker();
        worker.onmessage = (event: MessageEvent<EncodeResponse>) => {
          resolve(event.data);
        };
        worker.onerror = () => {
          reject(new Error('Worker encode failed'));
        };
        worker.postMessage({ text, opts });
      }),
    [initWorker],
  );

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const genOpts = useMemo<EncodeOptions>(
    () => ({
      errorCorrectionLevel: genLevel,
      color: {
        dark: genInvert ? '#ffffff' : '#000000',
        light: genInvert ? '#000000' : '#ffffff',
      },
      margin: 1,
    }),
    [genInvert, genLevel],
  );

  useEffect(() => {
    if (mode !== 'generate') return;

    const timeoutId = setTimeout(() => {
      const value = genText || ' ';
      encodeQr(value, genOpts)
        .then(({ png, svg }) => {
          setGenPng(png);
          setGenSvg(svg);
          setGenError('');
        })
        .catch(() => {
          setGenPng('');
          setGenSvg('');
          setGenError('Could not generate QR');
        });
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [encodeQr, genOpts, genText, mode]);

  const copyResult = () => {
    if (result) navigator.clipboard?.writeText(result).catch(() => {});
  };

  const copyGenText = () => {
    if (genText) navigator.clipboard?.writeText(genText).catch(() => {});
  };

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  const downloadSvgText = (svgText: string, filename: string) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const hasError = Boolean(error);

  return (
    <div className="flex h-full flex-col space-y-4 bg-kali-surface/95 p-4 text-kali-text">
      <div className="inline-flex w-fit rounded-xl border border-kali-border/70 bg-kali-surface/80 p-1">
        {(['scan', 'generate'] as Mode[]).map((nextMode) => (
          <button
            key={nextMode}
            type="button"
            onClick={() => setMode(nextMode)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
              mode === nextMode
                ? 'bg-kali-primary/20 text-kali-primary'
                : 'text-kali-text hover:bg-kali-surface/90'
            }`}
          >
            {nextMode}
          </button>
        ))}
      </div>

      {mode === 'scan' && (
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-full max-w-sm">
            <video
              ref={videoRef}
              aria-label="QR scanner preview"
              playsInline
              muted
              className="w-full rounded-xl border border-kali-border/70 bg-kali-surface/80 shadow-kali-panel"
            />
            <div
              className={`absolute top-2 right-2 flex gap-2 rounded-xl border p-1.5 shadow-lg backdrop-blur-sm transition ${
                hasError
                  ? 'border-kali-error/60 bg-kali-error/10'
                  : 'border-kali-border/70 bg-kali-surface/80'
              }`}
            >
              <button
                type="button"
                onClick={() => setTorch((t) => !t)}
                aria-label="Toggle flashlight"
                disabled={!torchAvailable}
                className={`rounded-lg border p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:cursor-not-allowed disabled:opacity-40 ${
                  hasError
                    ? 'border-kali-error/70 bg-kali-error/15 text-kali-error'
                    : 'border-kali-primary/50 bg-kali-primary/15 text-kali-primary'
                }`}
              >
                <FlashIcon className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
                aria-label="Switch camera"
                className={`rounded-lg border p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
                  hasError
                    ? 'border-kali-error/70 bg-kali-error/15 text-kali-error'
                    : 'border-kali-primary/50 bg-kali-primary/15 text-kali-primary'
                }`}
              >
                <SwitchCameraIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-kali-error/60 bg-kali-error/10 px-3 py-2 text-sm text-kali-error shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-error)_55%,transparent)]">
              {error}
            </p>
          )}

          {result && (
            <div className="flex w-full max-w-sm items-center gap-3 rounded-xl border border-kali-primary/60 bg-kali-surface/90 p-3 text-kali-text shadow-[0_12px_35px_rgba(15,148,210,0.16)]">
              {preview && (
                <img
                  src={preview}
                  alt="QR preview"
                  className="h-32 w-32 rounded-lg border border-kali-border/70 bg-kali-surface/80 p-1"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="break-all text-sm text-[color:color-mix(in_srgb,var(--color-text)_90%,transparent)]">
                  {result}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={copyResult}
                  aria-label="Copy result"
                  className="rounded-lg border border-transparent p-1.5 text-kali-primary transition hover:border-kali-primary/60 hover:bg-kali-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                >
                  <CopyIcon className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setResult('')}
                  className="rounded-lg border border-kali-border/70 px-2 py-1 text-xs text-kali-text transition hover:bg-kali-surface/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'generate' && (
        <div className="flex h-full flex-col gap-3 overflow-auto rounded-xl border border-kali-border/70 bg-kali-surface/80 p-3">
          <label htmlFor="qr-generate-text" className="text-sm text-kali-text">
            Content
          </label>
          <textarea
            id="qr-generate-text"
            value={genText}
            onChange={(e) => setGenText(e.target.value)}
            rows={4}
            aria-label="QR content"
            placeholder="Enter text or URL"
            className="w-full rounded-lg border border-kali-border/70 bg-kali-surface/90 px-3 py-2 text-sm text-kali-text placeholder:text-kali-text/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
          />

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label htmlFor="qr-error-level" className="flex items-center gap-2">
              Error level
              <select
                id="qr-error-level"
                value={genLevel}
                onChange={(e) => setGenLevel(e.target.value as ErrorLevel)}
                aria-label="Error correction level"
                className="rounded-md border border-kali-border/70 bg-kali-surface/90 px-2 py-1 text-kali-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
              >
                {errorLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="qr-invert" className="flex items-center gap-2">
              <input
                id="qr-invert"
                type="checkbox"
                checked={genInvert}
                onChange={(e) => setGenInvert(e.target.checked)}
                aria-label="Invert colors"
                className="h-4 w-4 rounded border-kali-border/70 bg-kali-surface/90 text-kali-primary focus:ring-kali-focus"
              />
              Invert colors
            </label>
          </div>

          {genError && (
            <p className="rounded-lg border border-kali-error/60 bg-kali-error/10 px-3 py-2 text-sm text-kali-error">
              {genError}
            </p>
          )}

          {genPng && (
            <img
              src={genPng}
              alt="Generated QR preview"
              className="h-48 w-48 rounded-lg border border-kali-border/70 bg-white p-1"
            />
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadDataUrl(genPng, 'qr.png')}
              disabled={!genPng}
              className="rounded-lg border border-kali-primary/50 bg-kali-primary/15 px-3 py-1.5 text-sm text-kali-primary transition hover:bg-kali-primary/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={() => downloadSvgText(genSvg, 'qr.svg')}
              disabled={!genSvg}
              className="rounded-lg border border-kali-primary/50 bg-kali-primary/15 px-3 py-1.5 text-sm text-kali-primary transition hover:bg-kali-primary/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Download SVG
            </button>
            <button
              type="button"
              onClick={copyGenText}
              disabled={!genText}
              className="rounded-lg border border-kali-border/70 px-3 py-1.5 text-sm text-kali-text transition hover:bg-kali-surface/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copy content
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const FlashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const SwitchCameraIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.13-3.36L23 10" />
    <path d="M20.49 15a9 9 0 0 1-14.13 3.36L1 14" />
  </svg>
);

const CopyIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export default QRTool;
