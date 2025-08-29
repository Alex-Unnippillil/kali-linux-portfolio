'use client';

import { useEffect, useRef, useState } from 'react';

const QRScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API not supported');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
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
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const copyResult = () => {
    if (result) navigator.clipboard?.writeText(result).catch(() => {});
  };

  const shareResult = () => {
    if (result && (navigator as any).share) {
      (navigator as any).share({ text: result }).catch(() => {});
    }
  };

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full flex flex-col items-center">
      <video ref={videoRef} className="w-full max-w-sm rounded bg-black" />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {result && (
        <div className="space-y-2 w-full max-w-sm">
          <p className="break-all text-sm">{result}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyResult}
              className="px-2 py-1 bg-blue-600 rounded"
            >
              Copy
            </button>
            {'share' in navigator && (
              <button
                type="button"
                onClick={shareResult}
                className="px-2 py-1 bg-blue-600 rounded"
              >
                Share
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;

