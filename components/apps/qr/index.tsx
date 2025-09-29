'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';

type ScannerStatus = 'idle' | 'awaiting-permission' | 'scanning' | 'error';

const StatusIndicator: React.FC<{ status: ScannerStatus; message: string }> = ({ status, message }) => {
  const color = useMemo(() => {
    switch (status) {
      case 'scanning':
        return 'bg-green-500';
      case 'awaiting-permission':
        return 'bg-yellow-400';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  }, [status]);

  return (
    <div className="flex items-center gap-2 text-sm text-white/80">
      <span className={`inline-block h-3 w-3 rounded-full ${color}`} aria-hidden />
      <span className="font-medium">{message}</span>
    </div>
  );
};

const QRScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('environment');
  const [startRequested, setStartRequested] = useState(false);
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('Ready to scan a QR code.');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [preview, setPreview] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(true);
  const [isEnumerating, setIsEnumerating] = useState(false);

  const shutdownStream = useCallback(() => {
    controlsRef.current?.stop?.();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
    });
    streamRef.current = null;
    trackRef.current = null;
    setTorch(false);
    setTorchSupported(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
  }, []);

  const loadDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDevices([]);
      setError('Camera enumeration is not supported in this browser. Switch to a modern browser like Chrome or Edge.');
      return;
    }
    setIsEnumerating(true);
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = all.filter((device) => device.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length === 0) {
        setStatus('error');
        setStatusMessage('No cameras detected.');
        setError('No camera inputs were found. Connect a webcam or enable camera access in your browser, then refresh the list.');
        setStartRequested(false);
        shutdownStream();
      } else {
        setError((previous) => (previous && previous.startsWith('No camera') ? null : previous));
      }
    } catch {
      setError('The browser blocked the device list. Allow camera access in the address bar, then try again.');
    } finally {
      setIsEnumerating(false);
    }
  }, [shutdownStream]);

  useEffect(() => {
    loadDevices();
    if (!navigator.mediaDevices?.addEventListener) return;
    const handler = () => loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', handler);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handler);
    };
  }, [loadDevices]);

  useEffect(() => {
    if (!startRequested) {
      shutdownStream();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setStatusMessage('Camera access not supported.');
      setError('Your browser does not support the camera APIs required for scanning. Try using Chrome, Edge, or Firefox.');
      setStartRequested(false);
      return;
    }

    let cancelled = false;

    const start = async () => {
      setStatus('awaiting-permission');
      setStatusMessage('Waiting for camera permission…');
      setError(null);
      setResult('');
      setPreview('');

      try {
        controlsRef.current?.stop?.();
        const videoConstraint: MediaTrackConstraints =
          selectedCamera === 'environment' || selectedCamera === 'user'
            ? { facingMode: selectedCamera }
            : { deviceId: { exact: selectedCamera } };
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        shutdownStream();
        streamRef.current = stream;
        trackRef.current = stream.getVideoTracks()[0] || null;
        setTorch(false);
        setTorchSupported(Boolean(trackRef.current?.getCapabilities?.().torch));

        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play();
        }

        setStatus('scanning');
        setStatusMessage('Point a QR code at the camera.');

        if ('BarcodeDetector' in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
          const scan = async () => {
            if (cancelled) return;
            try {
              if (videoRef.current) {
                const codes = await detector.detect(videoRef.current);
                if (codes[0]) setResult(codes[0].rawValue);
              }
            } catch {
              /* ignore detection blips */
            }
            if (!cancelled) requestAnimationFrame(scan);
          };
          scan();
        } else {
          const [{ BrowserQRCodeReader }, { NotFoundException }] = await Promise.all([
            import('@zxing/browser'),
            import('@zxing/library'),
          ]);
          if (cancelled) return;
          const codeReader = new BrowserQRCodeReader();
          controlsRef.current = await codeReader.decodeFromVideoDevice(
            undefined,
            videoRef.current!,
            (res, err) => {
              if (res) setResult(res.getText());
              if (err && !(err instanceof NotFoundException)) {
                setError('We could not read the QR code. Adjust the lighting or move the code closer, then try again.');
              }
            },
          );
        }
      } catch (err) {
        shutdownStream();
        setStartRequested(false);
        setStatus('error');
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setStatusMessage('Camera permission denied.');
          setError('Camera access was blocked. Use the camera icon in the browser’s address bar to allow access, then press “Start scanning” again.');
        } else if (err instanceof DOMException && err.name === 'NotFoundError') {
          setStatusMessage('No camera available.');
          setError('No camera was found. Connect a webcam or ensure your device camera is enabled, then retry.');
        } else if (err instanceof DOMException && err.name === 'NotReadableError') {
          setStatusMessage('Camera is in use by another app.');
          setError('Another application is using the camera. Close that app or tab, then start scanning again.');
        } else {
          setStatusMessage('Could not start the scanner.');
          setError('The scanner failed to start. Refresh the page and try again, or switch to a different browser.');
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      shutdownStream();
    };
  }, [selectedCamera, shutdownStream, startRequested]);

  useEffect(() => {
    const track = trackRef.current as any;
    if (!track) return;
    const capabilities = track.getCapabilities?.();
    const supportsTorch = Boolean(capabilities?.torch);
    setTorchSupported(supportsTorch);
    if (!supportsTorch) return;
    track
      .applyConstraints({ advanced: [{ torch }] })
      .catch(() => {
        setTorch(false);
        setError('Torch control is not available on this device. Try increasing ambient light instead.');
      });
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

  useEffect(() => {
    return () => {
      shutdownStream();
    };
  }, [shutdownStream]);

  const copyResult = () => {
    if (result) navigator.clipboard?.writeText(result).catch(() => {});
  };

  const toggleTorch = () => {
    if (!torchSupported) return;
    setTorch((t) => !t);
  };

  const switchCamera = () => {
    setSelectedCamera((current) => (current === 'environment' ? 'user' : 'environment'));
  };

  const cameraOptions = useMemo(() => {
    const baseOptions = [
      { label: 'Rear camera (if available)', value: 'environment' },
      { label: 'Front camera', value: 'user' },
    ];
    const deviceOptions = devices.map((device, index) => ({
      label: device.label || `Camera ${index + 1}`,
      value: device.deviceId,
    }));
    return [...baseOptions, ...deviceOptions];
  }, [devices]);

  const handleStop = useCallback(() => {
    setStartRequested(false);
    setStatus('idle');
    setStatusMessage('Camera stopped. Press “Start scanning” to try again.');
    shutdownStream();
  }, [shutdownStream]);

  const openScanner = () => {
    setShowPermissionModal(true);
  };

  const beginScanning = () => {
    setShowPermissionModal(false);
    setStartRequested(true);
  };

  return (
    <div className="relative flex h-full flex-col items-center gap-4 bg-ub-cool-grey p-4 text-white">
      <div className="w-full max-w-xl space-y-4 rounded-lg bg-black/30 p-4">
        <StatusIndicator status={status} message={statusMessage} />
        {error && (
          <div className="rounded border border-red-500/60 bg-red-500/10 p-3 text-sm text-red-200">
            <p className="font-semibold">Need help?</p>
            <p>{error}</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label htmlFor="qr-camera-select" className="text-sm font-semibold text-white/80">
            Camera source
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              id="qr-camera-select"
              value={selectedCamera}
              onChange={(event) => setSelectedCamera(event.target.value)}
              className="w-full rounded border border-white/20 bg-black/40 p-2 text-white"
            >
              {cameraOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadDevices}
              className="rounded bg-ub-dracula px-3 py-2 text-sm font-medium hover:bg-ub-dracula-dark disabled:opacity-60"
              disabled={isEnumerating}
            >
              {isEnumerating ? 'Refreshing…' : 'Refresh devices'}
            </button>
          </div>
          <p className="text-xs text-white/60">
            If cameras appear without labels, grant camera access in your browser so names become visible. Plug in new devices
            and click “Refresh devices” to update the list.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={openScanner}
            className="rounded bg-ub-dracula px-4 py-2 font-semibold hover:bg-ub-dracula-dark"
            disabled={startRequested && status !== 'error'}
          >
            {startRequested && status !== 'error' ? 'Scanning…' : 'Start scanning'}
          </button>
          <button
            type="button"
            onClick={handleStop}
            className="rounded bg-red-600 px-4 py-2 font-semibold hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!startRequested}
          >
            Stop camera
          </button>
        </div>
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
              className="rounded bg-black/50 p-1 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!torchSupported}
            >
              <FlashIcon className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={switchCamera}
              aria-label="Switch camera"
              className="rounded bg-black/50 p-1"
            >
              <SwitchCameraIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
        {result && (
          <div className="flex items-center gap-2 rounded-md bg-white p-2 text-black">
            {preview && (
              <img src={preview} alt="QR preview" className="h-32 w-32 rounded-md border" />
            )}
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm">{result}</p>
            </div>
            <button
              type="button"
              onClick={copyResult}
              aria-label="Copy result"
              className="p-1"
            >
              <CopyIcon className="h-6 w-6" />
            </button>
          </div>
        )}
      </div>
      {showPermissionModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-lg rounded-lg bg-ub-dark p-6 text-left text-white shadow-xl">
            <h2 className="text-lg font-semibold">Prepare to scan</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/80">
              <li>When prompted, allow the browser to use your camera.</li>
              <li>Point the camera steadily at the QR code so the full square is visible.</li>
              <li>If nothing happens, adjust lighting or choose a different camera above.</li>
            </ol>
            <p className="mt-3 text-xs text-white/60">
              Blocked the camera earlier? Use the camera icon in the address bar to re-enable it, then press “Start scanning”.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPermissionModal(false)}
                className="rounded bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={beginScanning}
                className="rounded bg-ub-dracula px-4 py-2 text-sm font-semibold hover:bg-ub-dracula-dark"
              >
                Start scanning
              </button>
            </div>
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

export default QRScanner;

