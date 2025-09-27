'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

const QRScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captionTrackRef = useRef<HTMLTrackElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [torch, setTorch] = useState(false);
  const [preview, setPreview] = useState('');
  const [captionsEnabled, setCaptionsEnabled] = useState(true);

  useEffect(() => {
    let active = true;
    const video = videoRef.current;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API not supported');
        return;
      }
      try {
        controlsRef.current?.stop?.();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
        });
        streamRef.current = stream;
        trackRef.current = stream.getVideoTracks()[0] || null;
        if (!active) return;
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.muted = true;
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
          const [{ BrowserQRCodeReader }, { NotFoundException }] = await Promise.all([
            import('@zxing/browser'),
            import('@zxing/library'),
          ]);
          const codeReader = new BrowserQRCodeReader();
          controlsRef.current = await codeReader.decodeFromVideoDevice(
            undefined,
            videoRef.current!,
            (res, err) => {
              if (res) setResult(res.getText());
              if (err && !(err instanceof NotFoundException)) {
                setError('Failed to read QR code');
              }
            },
          );
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
      controlsRef.current?.stop?.();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      trackRef.current = null;
    };
  }, [facing]);

  useEffect(() => {
    const track = captionTrackRef.current;
    if (!track) return;
    track.mode = captionsEnabled ? 'showing' : 'disabled';
  }, [captionsEnabled]);

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

  const toggleCaptions = () => setCaptionsEnabled((value) => !value);

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full flex flex-col items-center">
      <p id="qr-video-description" className="sr-only">
        Live camera preview used to scan QR codes. Captions provide scanning guidance.
      </p>
      <div className="relative w-full max-w-sm">
        <video
          ref={videoRef}
          className="w-full rounded-md border-2 border-white bg-black"
          muted
          autoPlay
          playsInline
          aria-describedby="qr-video-description"
          data-testid="qr-video"
        >
          <track
            ref={captionTrackRef}
            kind="captions"
            srcLang="en"
            src="/captions/qr-scanner.vtt"
            label="QR scanner instructions"
            default
          />
        </video>
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            type="button"
            onClick={toggleTorch}
            aria-label="Toggle flashlight"
            className="p-1 bg-black/50 rounded"
          >
            <FlashIcon className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={switchCamera}
            aria-label="Switch camera"
            className="p-1 bg-black/50 rounded"
          >
            <SwitchCameraIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={toggleCaptions}
        aria-pressed={captionsEnabled}
        className="px-4 py-2 bg-purple-700 rounded"
      >
        {captionsEnabled ? 'Hide Captions' : 'Show Captions'}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {result && (
        <div className="flex items-center gap-2 p-2 bg-white text-black rounded-md w-full max-w-sm">
          {preview && (
            <img
              src={preview}
              alt="QR preview"
              className="w-32 h-32 rounded-md border"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="break-all text-sm">{result}</p>
          </div>
          <button
            type="button"
            onClick={copyResult}
            aria-label="Copy result"
            className="p-1"
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

