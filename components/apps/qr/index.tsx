'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { CopyIcon, FlashIcon, SwitchCameraIcon } from '../../icons';

const QRScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
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

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full flex flex-col items-center">
      <div className="relative w-full max-w-sm">
        <video ref={videoRef} className="w-full rounded-md border-2 border-white bg-black" />
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

export default QRScanner;

