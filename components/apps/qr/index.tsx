'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';

const QRScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [preferredFacing, setPreferredFacing] = useState<'environment' | 'user'>('environment');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [preview, setPreview] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<
    'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported'
  >('unknown');
  const [restartToken, setRestartToken] = useState(0);

  const mediaDevices = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;

  const updateDeviceList = useCallback(async () => {
    if (!mediaDevices?.enumerateDevices) return;
    try {
      const list = await mediaDevices.enumerateDevices();
      const videoDevices = list.filter((device) => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length === 0) {
        setSelectedDeviceId(null);
        return;
      }
      if (
        selectedDeviceId &&
        !videoDevices.some((device) => device.deviceId === selectedDeviceId)
      ) {
        setSelectedDeviceId(videoDevices[0].deviceId || null);
      }
    } catch {
      setDevices([]);
    }
  }, [mediaDevices, selectedDeviceId]);

  useEffect(() => {
    if (!mediaDevices?.enumerateDevices) return;

    let cancelled = false;

    const syncDevices = async () => {
      if (cancelled) return;
      await updateDeviceList();
    };

    syncDevices();

    const handler = () => {
      syncDevices();
    };

    if (mediaDevices.addEventListener) {
      mediaDevices.addEventListener('devicechange', handler);
      return () => {
        cancelled = true;
        mediaDevices.removeEventListener?.('devicechange', handler);
      };
    }

    const original = mediaDevices.ondevicechange;
    mediaDevices.ondevicechange = handler;

    return () => {
      cancelled = true;
      if (mediaDevices.ondevicechange === handler) {
        mediaDevices.ondevicechange = original;
      }
    };
  }, [mediaDevices, updateDeviceList]);

  const constraints = useMemo<MediaStreamConstraints>(() => {
    if (selectedDeviceId) {
      return { video: { deviceId: { exact: selectedDeviceId } } };
    }
    return { video: { facingMode: { ideal: preferredFacing } } };
  }, [preferredFacing, selectedDeviceId]);

  useEffect(() => {
    let active = true;
    let cancelScan: (() => void) | undefined;
    const video = videoRef.current;

    const start = async () => {
      if (!mediaDevices?.getUserMedia) {
        setError('Camera API not supported');
        setPermissionStatus('unsupported');
        return;
      }

      try {
        setPermissionStatus('prompt');
        controlsRef.current?.stop?.();
        const stream = await mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        trackRef.current = stream.getVideoTracks()[0] || null;
        setPermissionStatus('granted');
        setError('');
        if (!active) return;
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play();
        }
        const track = trackRef.current as any;
        const capabilities = track?.getCapabilities?.();
        const supportsTorch = Boolean(capabilities?.torch);
        setTorchSupported(supportsTorch);
        if (!supportsTorch && torch) setTorch(false);
        await updateDeviceList();

        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          let rafId = 0;
          const scan = async () => {
            if (!active) return;
            try {
              const codes = await detector.detect(videoRef.current!);
              if (codes[0]) setResult(codes[0].rawValue);
            } catch {
              /* ignore */
            }
            rafId = requestAnimationFrame(scan);
          };
          scan();
          cancelScan = () => cancelAnimationFrame(rafId);
          return;
        }

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
      } catch (err) {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setPermissionStatus('denied');
          setError(
            'Camera access was denied. Allow camera permissions or use the Scan tab to upload images.',
          );
        } else {
          setPermissionStatus('unknown');
          setError('Could not start camera');
        }
      }
    };

    start();

    return () => {
      active = false;
      cancelScan?.();
      controlsRef.current?.stop?.();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      trackRef.current = null;
      setTorchSupported(false);
    };
  }, [constraints, mediaDevices, restartToken, torch, updateDeviceList]);

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
    if (devices.length > 1) {
      setSelectedDeviceId((current) => {
        if (!current) return devices[1]?.deviceId || null;
        const currentIndex = devices.findIndex((device) => device.deviceId === current);
        const nextIndex = (currentIndex + 1) % devices.length;
        return devices[nextIndex]?.deviceId || null;
      });
      setRestartToken((token) => token + 1);
      return;
    }
    setPreferredFacing((f) => (f === 'environment' ? 'user' : 'environment'));
    setSelectedDeviceId(null);
    setRestartToken((token) => token + 1);
  };

  const retryCamera = () => {
    setRestartToken((token) => token + 1);
  };

  const cameraLabel = devices.length ? 'Camera source' : 'Camera preference';
  const autoLabel = `Auto (${preferredFacing === 'environment' ? 'rear' : 'front'})`;

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full flex flex-col items-center">
      <div className="relative w-full max-w-sm">
        <video
          ref={videoRef}
          className="w-full rounded-md border-2 border-white bg-black"
          aria-label="Camera preview"
        />
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            type="button"
            onClick={toggleTorch}
            aria-label="Toggle flashlight"
            className="p-1 bg-black/50 rounded disabled:opacity-50"
            disabled={!torchSupported}
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
      <div className="w-full max-w-sm flex flex-col gap-2">
        <label className="text-sm flex flex-col gap-1">
          <span>{cameraLabel}</span>
          <select
            value={selectedDeviceId ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedDeviceId(value || null);
              setRestartToken((token) => token + 1);
            }}
            className="rounded p-1 text-black"
            aria-label={cameraLabel}
          >
            <option value="">{autoLabel}</option>
            {devices.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
        {permissionStatus === 'denied' && (
          <div className="text-xs text-red-400 space-y-1" role="alert">
            <p>Camera access is blocked. Enable permissions in your browser settings to scan live codes.</p>
            <p>You can also switch to the Scan tab and drop an image while permissions are denied.</p>
            <button
              type="button"
              onClick={retryCamera}
              className="px-2 py-1 bg-blue-600 rounded text-white text-xs self-start"
            >
              Retry camera access
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500" role="status">
          {error}
        </p>
      )}
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

