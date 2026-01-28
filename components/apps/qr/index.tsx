'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

const QRScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [torch, setTorch] = useState(false);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    let active = true;
    const video = videoRef.current;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API not supported');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
        });
        streamRef.current = stream;
        trackRef.current = stream.getVideoTracks()[0] || null;
        if (!active) return;
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play();
        }
        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const scan = async () => {
            if (!active) return;
            try {
              const codes = await detector.detect(videoRef.current!);
              if (codes[0]) setResult(codes[0].rawValue);
            } catch {
              /* ignore */
            }
            requestAnimationFrame(scan);
          };
          scan();
        } else {
          const jsQR = (await import('jsqr')).default;
          const scanFrame = async () => {
            if (!active) return;
            try {
              const videoEl = videoRef.current;
              if (videoEl && videoEl.readyState === videoEl.HAVE_ENOUGH_DATA) {
                const canvas = document.createElement('canvas');
                canvas.width = videoEl.videoWidth;
                canvas.height = videoEl.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const code = jsQR(imageData.data, canvas.width, canvas.height);
                  if (code) setResult(code.data);
                }
              }
            } catch {
              /* ignore frame errors */
            }
            requestAnimationFrame(scanFrame);
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
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      trackRef.current = null;
    };
  }, [facing]);

  useEffect(() => {
    const track = trackRef.current as any;
    if (!track) return;
    const capabilities = track.getCapabilities?.();
    if (!capabilities?.torch) return;
    track.applyConstraints({ advanced: [{ torch }] }).catch(() => {});
  }, [torch]);

  useEffect(() => {
    if (result) {
      QRCode.toDataURL(result, { width: 128 })
        .then(setPreview)
        .catch(() => setPreview(''));
    } else {
      setPreview('');
    }
  }, [result]);

  const copyResult = () => {
    if (result) navigator.clipboard?.writeText(result).catch(() => {});
  };

  const toggleTorch = () => {
    setTorch((t) => !t);
  };

  const switchCamera = () => {
    setFacing((f) => (f === 'environment' ? 'user' : 'environment'));
  };

  const hasError = Boolean(error);

  return (
    <div className="flex h-full flex-col items-center space-y-4 bg-kali-surface/95 p-4 text-kali-text">
      <div className="relative w-full max-w-sm">
        <video
          ref={videoRef}
          aria-label="QR scanner preview"
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
            onClick={toggleTorch}
            aria-label="Toggle flashlight"
            className={`rounded-lg border p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
              hasError
                ? 'border-kali-error/70 bg-kali-error/15 text-kali-error'
                : 'border-kali-primary/50 bg-kali-primary/15 text-kali-primary'
            }`}
          >
            <FlashIcon className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={switchCamera}
            aria-label="Switch camera"
            className={`rounded-lg border p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
              hasError
                ? 'border-kali-error/70 bg-kali-error/15 text-kali-error'
                : 'border-kali-primary/50 bg-kali-primary/15 text-kali-primary'
            }`}
          >
            <SwitchCameraIcon className="w-6 h-6" />
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
          <div className="flex-1 min-w-0">
            <p className="break-all text-sm text-[color:color-mix(in_srgb,var(--color-text)_90%,transparent)]">{result}</p>
          </div>
          <button
            type="button"
            onClick={copyResult}
            aria-label="Copy result"
            className="rounded-lg border border-transparent p-1.5 text-kali-primary transition hover:border-kali-primary/60 hover:bg-kali-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
          >
            <CopyIcon className="w-6 h-6" />
          </button>
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

export default QRScanner;
