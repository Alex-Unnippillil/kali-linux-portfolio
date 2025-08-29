'use client';

import { useEffect, useRef, useState } from 'react';

const Scanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<any>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [permissionMessage, setPermissionMessage] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API not supported');
        return;
      }
      try {
        setPermissionMessage('Requesting camera permission...');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        if (!active) return;
        setPermissionMessage('');
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play();
        }
        const [track] = stream.getVideoTracks();
        trackRef.current = track;
        const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
        if (capabilities?.torch) setTorchAvailable(true);

        const [{ BrowserQRCodeReader }, { NotFoundException }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        if (!active) return;
        const reader = new BrowserQRCodeReader();
        readerRef.current = reader;
        reader.decodeFromVideoDevice(undefined, videoRef.current!, (res, err) => {
          if (!active) return;
          if (res) {
            setResult(res.getText());
          }
          if (err && !(err instanceof NotFoundException)) {
            setError('Failed to read QR code');
          }
        });
      } catch (err: any) {
        if (err?.name === 'NotAllowedError') {
          setError('Camera access was denied');
        } else if (err?.name === 'NotFoundError') {
          setError('No camera found');
        } else {
          setError('Could not start camera');
        }
      }
    };
    start();
    return () => {
      active = false;
      readerRef.current?.reset?.();
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, []);

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;
    try {
      const desired = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: desired }] });
      setTorchOn(desired);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full flex flex-col items-center">
      <video ref={videoRef} className="w-full max-w-sm rounded bg-black" />
      {permissionMessage && <p className="text-sm">{permissionMessage}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {torchAvailable && !error && (
        <button
          type="button"
          onClick={toggleTorch}
          className="px-2 py-1 bg-blue-600 rounded"
        >
          {torchOn ? 'Torch off' : 'Torch on'}
        </button>
      )}
      {result && (
        <div className="space-y-2 w-full max-w-sm">
          <p className="break-all text-sm">{result}</p>
        </div>
      )}
    </div>
  );
};

export default Scanner;

