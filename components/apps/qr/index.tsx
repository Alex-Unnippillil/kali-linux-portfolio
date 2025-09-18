'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

type CheckStatus = 'pass' | 'warn' | 'fail';

interface PreflightCheck {
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  suggestion?: string;
}

interface PreflightDiagnostics {
  hasMediaDevices: boolean;
  enumerateSupported: boolean;
  getUserMediaSupported: boolean;
  ready: boolean;
  videoDeviceCount?: number;
  permissionState: PermissionState | 'unsupported' | 'error';
  enumerateError?: string;
  permissionError?: string;
  devices?: Array<{ kind: string; label: string }>;
  checks: Array<{ id: string; status: CheckStatus }>;
}

const QRScanner: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const permissionStatusRef = useRef<PermissionStatus | null>(null);
  const isMountedRef = useRef(true);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [torch, setTorch] = useState(false);
  const [preview, setPreview] = useState('');
  const [preflightChecks, setPreflightChecks] = useState<PreflightCheck[]>([]);
  const [preflightStatus, setPreflightStatus] = useState<'pending' | 'ready' | 'blocked'>('pending');
  const [preflightLoading, setPreflightLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  const runPreflight = useCallback(async (): Promise<boolean> => {
    if (!isMountedRef.current) return false;
    setPreflightLoading(true);
    setPreflightStatus('pending');

    const hasMediaDevices = Boolean(navigator.mediaDevices);
    const getUserMediaSupported = Boolean(navigator.mediaDevices?.getUserMedia);
    const enumerateSupported = typeof navigator.mediaDevices?.enumerateDevices === 'function';

    const checks: PreflightCheck[] = [];
    const diagnostics: PreflightDiagnostics = {
      hasMediaDevices,
      enumerateSupported,
      getUserMediaSupported,
      ready: false,
      permissionState: 'unsupported',
      checks: [],
    };

    if (!hasMediaDevices) {
      checks.push({
        id: 'media-devices',
        label: 'Media Devices API',
        status: 'fail',
        message: 'Camera APIs are not available in this browser.',
        suggestion: 'Use a modern browser that supports MediaDevices.',
      });
    } else {
      checks.push({
        id: 'media-devices',
        label: 'Media Devices API',
        status: 'pass',
        message: 'Media devices API detected.',
      });

      if (!getUserMediaSupported) {
        checks.push({
          id: 'get-user-media',
          label: 'Camera stream support',
          status: 'fail',
          message: 'Camera streaming is not supported.',
          suggestion: 'Use a browser that supports navigator.mediaDevices.getUserMedia.',
        });
      } else {
        checks.push({
          id: 'get-user-media',
          label: 'Camera stream support',
          status: 'pass',
          message: 'Browser can start camera streams.',
        });
      }

      if (!enumerateSupported) {
        checks.push({
          id: 'enumerate-devices',
          label: 'Device enumeration',
          status: 'fail',
          message: 'Cannot list connected cameras.',
          suggestion: 'Allow camera permissions or try reconnecting your webcam.',
        });
      } else {
        try {
          const devices = await navigator.mediaDevices!.enumerateDevices();
          diagnostics.devices = devices.map((device) => ({
            kind: device.kind,
            label: device.label || device.deviceId,
          }));
          const videoDevices = devices.filter((device) => device.kind === 'videoinput');
          diagnostics.videoDeviceCount = videoDevices.length;
          if (videoDevices.length === 0) {
            checks.push({
              id: 'camera-availability',
              label: 'Connected cameras',
              status: 'fail',
              message: 'No camera detected.',
              suggestion: 'Connect a webcam and ensure no other app is using it.',
            });
          } else {
            checks.push({
              id: 'camera-availability',
              label: 'Connected cameras',
              status: 'pass',
              message: `Found ${videoDevices.length} camera${videoDevices.length > 1 ? 's' : ''} ready to use.`,
            });
          }
        } catch (err) {
          diagnostics.enumerateError = err instanceof Error ? err.message : String(err);
          checks.push({
            id: 'camera-availability',
            label: 'Connected cameras',
            status: 'fail',
            message: 'Could not list cameras.',
            suggestion: 'Ensure the browser has permission to access media devices.',
          });
        }
      }
    }

    let permissionState: PermissionState | 'unsupported' | 'error' = 'unsupported';
    if ('permissions' in navigator && typeof navigator.permissions?.query === 'function') {
      try {
        const status = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });
        if (permissionStatusRef.current?.onchange) {
          permissionStatusRef.current.onchange = null;
        }
        permissionStatusRef.current = status;
        status.onchange = () => {
          void runPreflight();
        };
        permissionState = status.state;
        if (status.state === 'denied') {
          checks.push({
            id: 'camera-permission',
            label: 'Camera permission',
            status: 'fail',
            message: 'Camera access has been denied.',
            suggestion: 'Update your browser settings to allow camera access for this site.',
          });
        } else if (status.state === 'prompt') {
          checks.push({
            id: 'camera-permission',
            label: 'Camera permission',
            status: 'warn',
            message: 'Camera access will be requested when starting.',
            suggestion: 'Be ready to approve the permission prompt when it appears.',
          });
        } else {
          checks.push({
            id: 'camera-permission',
            label: 'Camera permission',
            status: 'pass',
            message: 'Camera permission already granted.',
          });
        }
      } catch (err) {
        diagnostics.permissionError = err instanceof Error ? err.message : String(err);
        permissionState = 'error';
        checks.push({
          id: 'camera-permission',
          label: 'Camera permission',
          status: 'warn',
          message: 'Unable to read camera permission status.',
          suggestion: 'Start the scanner to trigger the permission prompt.',
        });
      }
    } else {
      checks.push({
        id: 'camera-permission',
        label: 'Camera permission',
        status: 'warn',
        message: 'Browser does not expose permission status.',
        suggestion: 'Starting the scanner may show a permission prompt.',
      });
    }

    const ready = checks.every((check) => check.status !== 'fail');
    diagnostics.permissionState = permissionState;
    diagnostics.ready = ready;
    diagnostics.checks = checks.map((check) => ({ id: check.id, status: check.status }));

    if (isMountedRef.current) {
      setPreflightChecks(checks);
      setPreflightStatus(ready ? 'ready' : 'blocked');
      setPreflightLoading(false);
    }

    if (ready) {
      console.info('[QR Scanner] Preflight diagnostics', diagnostics);
    } else {
      console.warn('[QR Scanner] Preflight diagnostics', diagnostics);
    }

    return ready;
  }, []);

  useEffect(() => {
    if (!isRunning) return undefined;

    let active = true;
    const video = videoRef.current;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API not supported');
        setIsRunning(false);
        void runPreflight();
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
        setError('');
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
        setIsRunning(false);
        void runPreflight();
      }
    };

    void start();

    return () => {
      active = false;
      controlsRef.current?.stop?.();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (video) video.srcObject = null;
      trackRef.current = null;
    };
  }, [facing, isRunning, runPreflight]);

  useEffect(() => {
    const track = trackRef.current as any;
    if (!track) return;
    const capabilities = track.getCapabilities?.();
    if (!capabilities?.torch) return;
    track.applyConstraints({ advanced: [{ torch }] }).catch(() => {});
  }, [torch]);

  useEffect(() => {
    if (isRunning) return;
    controlsRef.current?.stop?.();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
    trackRef.current = null;
  }, [isRunning]);

  useEffect(() => {
    const initialVideo = videoRef.current;
    void runPreflight();
    return () => {
      isMountedRef.current = false;
      if (permissionStatusRef.current?.onchange) {
        permissionStatusRef.current.onchange = null;
      }
      controlsRef.current?.stop?.();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (initialVideo) {
        initialVideo.srcObject = null;
      }
    };
  }, [runPreflight]);

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

  const startScanner = useCallback(async () => {
    if (isRunning || preflightLoading) return;
    if (preflightStatus !== 'ready') {
      const ready = await runPreflight();
      if (!ready) return;
    }
    setError('');
    setIsRunning(true);
  }, [isRunning, preflightLoading, preflightStatus, runPreflight]);

  const stopScanner = useCallback(() => {
    setIsRunning(false);
  }, []);

  const retryPreflight = useCallback(() => {
    void runPreflight();
  }, [runPreflight]);

  const statusColors: Record<CheckStatus, string> = {
    pass: 'text-green-300',
    warn: 'text-yellow-300',
    fail: 'text-red-300',
  };

  const statusLabels: Record<CheckStatus, string> = {
    pass: 'OK',
    warn: 'Review',
    fail: 'Blocked',
  };

  const preflightSummary =
    preflightStatus === 'ready'
      ? 'All systems go — you can start scanning.'
      : preflightStatus === 'blocked'
        ? 'Resolve the highlighted issues before starting.'
        : 'Running device and permission checks...';

  const preflightSummaryColor =
    preflightStatus === 'ready'
      ? 'text-green-300'
      : preflightStatus === 'blocked'
        ? 'text-red-300'
        : 'text-yellow-300';

  const startDisabled = preflightLoading || preflightStatus !== 'ready' || isRunning;

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full flex flex-col items-center">
      <div className="w-full max-w-sm">
        <div className="w-full rounded-md border border-white/10 bg-black/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Preflight checks</h2>
            <span
              className={`text-xs font-semibold uppercase ${preflightSummaryColor}`}
            >
              {preflightStatus === 'ready'
                ? 'Ready'
                : preflightStatus === 'blocked'
                  ? 'Blocked'
                  : 'Checking'}
            </span>
          </div>
          <p className={`text-sm ${preflightSummaryColor}`}>{preflightSummary}</p>
          {preflightLoading ? (
            <p className="text-xs text-gray-300">Checking camera and permission status…</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {preflightChecks.map((check) => (
                <li
                  key={check.id}
                  className="rounded border border-white/10 bg-black/30 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{check.label}</span>
                    <span
                      className={`text-xs font-semibold uppercase ${statusColors[check.status]}`}
                    >
                      {statusLabels[check.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-200">{check.message}</p>
                  {check.suggestion && (
                    <p className="mt-1 text-xs italic text-gray-400">{check.suggestion}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={retryPreflight}
              className="rounded bg-gray-700 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={preflightLoading}
            >
              {preflightLoading ? 'Checking…' : 'Re-run checks'}
            </button>
            <button
              type="button"
              onClick={() => void startScanner()}
              className="rounded bg-blue-600 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={startDisabled}
            >
              {isRunning ? 'Scanner running' : 'Start scanner'}
            </button>
            {isRunning && (
              <button
                type="button"
                onClick={stopScanner}
                className="rounded bg-red-600 px-3 py-1 text-sm"
              >
                Stop scanner
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative w-full max-w-sm">
        <video
          ref={videoRef}
          aria-label="QR scanner preview"
          className="w-full rounded-md border-2 border-white bg-black"
        />
        {!isRunning && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/70 text-center text-xs text-gray-200">
            Start the scanner once preflight passes to access the camera feed.
          </div>
        )}
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            type="button"
            onClick={toggleTorch}
            aria-label="Toggle flashlight"
            className="p-1 bg-black/50 rounded disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isRunning}
          >
            <FlashIcon className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={switchCamera}
            aria-label="Switch camera"
            className="p-1 bg-black/50 rounded disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!isRunning}
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

