"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

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

const CameraApp: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const permissionStatusRef = useRef<PermissionStatus | null>(null);
  const isMountedRef = useRef(true);
  const [snapshot, setSnapshot] = useState<string>('');
  const [drawing, setDrawing] = useState(false);
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [preflightChecks, setPreflightChecks] = useState<PreflightCheck[]>([]);
  const [preflightStatus, setPreflightStatus] = useState<
    'pending' | 'ready' | 'blocked'
  >('pending');
  const [preflightLoading, setPreflightLoading] = useState(true);

  const runPreflight = useCallback(async (): Promise<boolean> => {
    if (!isMountedRef.current) return false;
    setPreflightLoading(true);
    setPreflightStatus('pending');

    const hasMediaDevices = Boolean(navigator.mediaDevices);
    const getUserMediaSupported = Boolean(
      navigator.mediaDevices?.getUserMedia,
    );
    const enumerateSupported =
      typeof navigator.mediaDevices?.enumerateDevices === 'function';

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
          suggestion:
            'Use a browser that supports navigator.mediaDevices.getUserMedia.',
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
          const videoDevices = devices.filter(
            (device) => device.kind === 'videoinput',
          );
          diagnostics.videoDeviceCount = videoDevices.length;
          if (videoDevices.length === 0) {
            checks.push({
              id: 'camera-availability',
              label: 'Connected cameras',
              status: 'fail',
              message: 'No camera detected.',
              suggestion:
                'Connect a webcam and ensure no other app is using it.',
            });
          } else {
            const cameraLabel =
              videoDevices.length === 1 ? 'camera' : 'cameras';
            checks.push({
              id: 'camera-availability',
              label: 'Connected cameras',
              status: 'pass',
              message: `Found ${videoDevices.length} ${cameraLabel} ready to use.`,
            });
          }
        } catch (err) {
          diagnostics.enumerateError =
            err instanceof Error ? err.message : String(err);
          checks.push({
            id: 'camera-availability',
            label: 'Connected cameras',
            status: 'fail',
            message: 'Could not list cameras.',
            suggestion:
              'Ensure the browser has permission to access media devices.',
          });
        }
      }
    }

    let permissionState: PermissionState | 'unsupported' | 'error' =
      'unsupported';
    if (
      'permissions' in navigator &&
      typeof navigator.permissions?.query === 'function'
    ) {
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
            suggestion:
              'Update your browser settings to allow camera access for this site.',
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
        diagnostics.permissionError =
          err instanceof Error ? err.message : String(err);
        permissionState = 'error';
        checks.push({
          id: 'camera-permission',
          label: 'Camera permission',
          status: 'warn',
          message: 'Unable to read camera permission status.',
          suggestion: 'Start the camera to trigger the permission prompt.',
        });
      }
    } else {
      checks.push({
        id: 'camera-permission',
        label: 'Camera permission',
        status: 'warn',
        message: 'Browser does not expose permission status.',
        suggestion: 'Starting the camera may show a permission prompt.',
      });
    }

    const ready = checks.every((check) => check.status !== 'fail');
    diagnostics.permissionState = permissionState;
    diagnostics.ready = ready;
    diagnostics.checks = checks.map((check) => ({
      id: check.id,
      status: check.status,
    }));

    if (isMountedRef.current) {
      setPreflightChecks(checks);
      setPreflightStatus(ready ? 'ready' : 'blocked');
      setPreflightLoading(false);
    }

    if (ready) {
      console.info('[Camera App] Preflight diagnostics', diagnostics);
    } else {
      console.warn('[Camera App] Preflight diagnostics', diagnostics);
    }

    return ready;
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    let active = true;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera API not supported');
        setIsRunning(false);
        void runPreflight();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        streamRef.current = stream;
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => {});
        }
        setError('');
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
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
      }
    };
  }, [isRunning, runPreflight]);

  useEffect(() => {
    const video = videoRef.current;
    void runPreflight();
    return () => {
      isMountedRef.current = false;
      if (permissionStatusRef.current?.onchange) {
        permissionStatusRef.current.onchange = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (video) {
        video.srcObject = null;
      }
    };
  }, [runPreflight]);

  const handleLoaded = () => {
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isRunning) return;
    setDrawing(true);
    const { x, y } = getPos(e);
    const ctx = overlayRef.current!.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !isRunning) return;
    const { x, y } = getPos(e);
    const ctx = overlayRef.current!.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setDrawing(false);
  };

  const clearOverlay = useCallback(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, overlay.width, overlay.height);
  }, []);

  const takeSnapshot = () => {
    if (!isRunning) return;
    const video = videoRef.current;
    const overlay = overlayRef.current;
    if (!video || !overlay) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(overlay, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL('image/png'));
  };

  const startCamera = useCallback(async () => {
    if (isRunning || preflightLoading) return;
    if (preflightStatus !== 'ready') {
      const ready = await runPreflight();
      if (!ready) return;
    }
    setError('');
    setIsRunning(true);
  }, [isRunning, preflightLoading, preflightStatus, runPreflight]);

  const stopCamera = useCallback(() => {
    setIsRunning(false);
    setError('');
    clearOverlay();
  }, [clearOverlay]);

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
      ? 'All systems go — you can start the camera.'
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
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto flex flex-col items-center space-y-4">
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
              onClick={() => void startCamera()}
              className="rounded bg-blue-600 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={startDisabled}
            >
              {isRunning ? 'Camera running' : 'Start camera'}
            </button>
            {isRunning && (
              <button
                type="button"
                onClick={stopCamera}
                className="rounded bg-red-600 px-3 py-1 text-sm"
              >
                Stop camera
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="relative">
        <video
          ref={videoRef}
          className="rounded"
          onLoadedMetadata={handleLoaded}
          autoPlay
          playsInline
        />
        <canvas
          ref={overlayRef}
          className="absolute top-0 left-0 rounded cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        {!isRunning && (
          <div className="absolute inset-0 flex items-center justify-center rounded bg-black/70 text-center text-xs text-gray-200">
            Start the camera once preflight passes to access the live feed.
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="space-x-2">
        <button
          type="button"
          onClick={takeSnapshot}
          className="px-4 py-2 bg-blue-700 rounded disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!isRunning}
        >
          Snapshot
        </button>
        <button
          type="button"
          onClick={clearOverlay}
          className="px-4 py-2 bg-gray-700 rounded"
        >
          Clear Overlay
        </button>
      </div>
      {snapshot && (
        <img
          src={snapshot}
          alt="Snapshot"
          className="max-w-full border border-gray-700 rounded"
        />
      )}
    </div>
  );
};

export default CameraApp;

