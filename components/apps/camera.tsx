import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const formatTimestamp = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const CameraApp = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'streaming' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>('');
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [captures, setCaptures] = useState<
    Array<{ id: string; url: string; timestamp: Date; width: number; height: number }>
  >([]);

  const hasMediaSupport = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const loadDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const list = await navigator.mediaDevices.enumerateDevices();
    setDevices(list.filter((device) => device.kind === 'videoinput'));
  }, []);

  const startStream = useCallback(
    async (deviceId?: string) => {
      if (!hasMediaSupport) {
        setError('Camera access is not supported in this browser.');
        setStatus('error');
        return;
      }

      setStatus('loading');
      setError(null);

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            facingMode: deviceId ? undefined : { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        stopStream();
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          await videoRef.current.play();
        }

        await loadDevices();
        if (!deviceId) {
          const track = newStream.getVideoTracks()[0];
          const settings = track.getSettings();
          if (settings.deviceId) {
            setActiveDeviceId(settings.deviceId);
          }
        }

        setStatus('streaming');
      } catch (err) {
        console.error('Camera start error:', err);
        setStatus('error');
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow access to continue.');
        } else {
          setError('Unable to start the camera. Check permissions or hardware.');
        }
      }
    },
    [hasMediaSupport, loadDevices, stopStream]
  );

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  const handleDeviceChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setActiveDeviceId(value);
    if (value) {
      await startStream(value);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return;

    if (isMirrored) {
      context.translate(width, 0);
      context.scale(-1, 1);
    }

    context.drawImage(video, 0, 0, width, height);
    const url = canvas.toDataURL('image/png');

    setCaptures((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        url,
        timestamp: new Date(),
        width,
        height,
      },
      ...prev,
    ]);
  };

  const downloadCapture = (url: string, timestamp: Date) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `camera-shot-${timestamp.toISOString().slice(0, 19)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const removeCapture = (id: string) => {
    setCaptures((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCaptures = () => setCaptures([]);

  const activeDeviceLabel = useMemo(() => {
    const device = devices.find((item) => item.deviceId === activeDeviceId);
    return device?.label || 'Default camera';
  }, [devices, activeDeviceId]);

  return (
    <div className="flex h-full w-full flex-col bg-slate-950 text-white">
      <div className="border-b border-white/10 bg-slate-900/80 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300">Kali Lens</p>
            <h1 className="text-xl font-semibold sm:text-2xl">Camera Studio</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-300">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {status === 'streaming' ? 'Live' : 'Offline'}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {captures.length} capture{captures.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-hidden p-4 sm:p-6 lg:flex-row">
        <section className="flex flex-1 flex-col gap-4">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Active Camera</p>
                <p className="text-lg font-medium text-white">{activeDeviceLabel}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                  onClick={() => startStream(activeDeviceId || undefined)}
                  disabled={status === 'loading'}
                >
                  {status === 'streaming' ? 'Restart' : 'Start Camera'}
                </button>
                <button
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                  onClick={stopStream}
                  disabled={!stream}
                >
                  Stop
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Camera Source
                <select
                  className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white"
                  onChange={handleDeviceChange}
                  value={activeDeviceId}
                >
                  <option value="">Default camera</option>
                  {devices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Preview Orientation
                <button
                  className="rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white hover:bg-white/10"
                  onClick={() => setIsMirrored((prev) => !prev)}
                >
                  {isMirrored ? 'Mirrored (Selfie Mode)' : 'Standard View'}
                </button>
              </label>
            </div>
          </div>

          <div className="relative flex min-h-[260px] flex-1 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/70">
            {!hasMediaSupport && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-300">
                <p>Camera APIs are not available in this browser.</p>
                <p>Please open the app in a modern desktop or mobile browser.</p>
              </div>
            )}
            <video
              ref={videoRef}
              className={`h-full w-full object-cover ${isMirrored ? '-scale-x-100' : ''}`}
              playsInline
              muted
              autoPlay
            />
            {status !== 'streaming' && hasMediaSupport && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-center text-sm text-slate-200">
                <p className="text-base font-medium">Camera feed is offline</p>
                <p className="max-w-xs text-slate-400">Tap “Start Camera” to begin. We never upload your photos.</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Capture</p>
              <p className="text-sm text-slate-200">Snap a photo and keep it in your local gallery.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full bg-cyan-500 px-6 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-600"
                onClick={capturePhoto}
                disabled={!stream || status !== 'streaming'}
              >
                Capture Photo
              </button>
              <button
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:cursor-not-allowed"
                onClick={clearCaptures}
                disabled={captures.length === 0}
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        <aside className="flex w-full flex-col gap-4 lg:w-[360px]">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <h2 className="text-base font-semibold">Session Details</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className="text-slate-100">{status === 'streaming' ? 'Streaming' : 'Idle'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Device</span>
                <span className="text-slate-100">{activeDeviceLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Preview</span>
                <span className="text-slate-100">{isMirrored ? 'Mirrored' : 'Standard'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">Capture Gallery</h2>
                <p className="text-xs text-slate-400">Stored locally in this session</p>
              </div>
              <span className="text-xs text-slate-400">{captures.length} total</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {captures.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
                  No captures yet. Take a photo to start your gallery.
                </div>
              ) : (
                <div className="grid gap-4">
                  {captures.map((capture) => (
                    <div
                      key={capture.id}
                      className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/60"
                    >
                      <img src={capture.url} alt="Captured" className="h-40 w-full object-cover" />
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-slate-300">
                        <div>
                          <p className="text-slate-100">{formatTimestamp(capture.timestamp)}</p>
                          <p className="text-slate-500">
                            {capture.width} × {capture.height}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white hover:bg-white/10"
                            onClick={() => downloadCapture(capture.url, capture.timestamp)}
                          >
                            Download
                          </button>
                          <button
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white hover:bg-white/10"
                            onClick={() => removeCapture(capture.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CameraApp;

export const displayCamera = () => <CameraApp />;
