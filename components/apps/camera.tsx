import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useOPFS from '../../hooks/useOPFS';

type CameraStatus = 'idle' | 'loading' | 'streaming' | 'error';
type CaptureMode = 'photo' | 'video';
type EffectMode = 'none' | 'noir' | 'night-vision' | 'vhs' | 'pixelate' | 'cyberpunk' | 'glitch';
type TimerOption = 0 | 3 | 10;

type CaptureItem = {
  id: string;
  name: string;
  type: 'photo' | 'video';
  url: string;
  persisted: boolean;
  createdAt: string;
};

type MappedError = {
  title: string;
  hint: string;
};

type VideoTrackCaps = {
  zoom?: { min?: number; max?: number; step?: number };
  torch?: boolean;
};

const EFFECT_OPTIONS: Array<{ value: EffectMode; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'noir', label: 'Noir' },
  { value: 'night-vision', label: 'Night Vision' },
  { value: 'vhs', label: 'VHS' },
  { value: 'pixelate', label: 'Pixelate' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
  { value: 'glitch', label: 'Glitch' },
];

const mapDomError = (err: unknown): MappedError => {
  if (!(err instanceof DOMException)) {
    return { title: 'Camera failed to start.', hint: 'Please retry and verify your browser has camera access.' };
  }

  const table: Record<string, MappedError> = {
    NotAllowedError: {
      title: 'Permission denied.',
      hint: 'Use “Start Camera” and allow camera access in your browser prompt.',
    },
    NotFoundError: {
      title: 'No camera found.',
      hint: 'Connect a camera and try again.',
    },
    NotReadableError: {
      title: 'Camera is busy.',
      hint: 'Close other apps using the camera and retry.',
    },
    OverconstrainedError: {
      title: 'Requested camera settings are unsupported.',
      hint: 'Switch camera source or reset controls like zoom.',
    },
    AbortError: {
      title: 'Camera startup was interrupted.',
      hint: 'Try starting the camera again.',
    },
  };

  return table[err.name] || { title: 'Unable to access camera.', hint: 'Check browser permissions and hardware.' };
};

const formatDateStamp = (date: Date) => {
  const pad = (v: number) => String(v).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}${pad(date.getSeconds())}`;
};

const CameraApp = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestIdRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);
  const persistedUrlRef = useRef<string[]>([]);
  const sessionUrlRef = useRef<string[]>([]);

  const [status, setStatus] = useState<CameraStatus>('idle');
  const [mode, setMode] = useState<CaptureMode>('photo');
  const [error, setError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState('');
  const [isPreviewMirrored, setIsPreviewMirrored] = useState(true);
  const [mirrorSelfieCapture, setMirrorSelfieCapture] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [timerOption, setTimerOption] = useState<TimerOption>(0);
  const [countdown, setCountdown] = useState(0);
  const [sessionCaptures, setSessionCaptures] = useState<CaptureItem[]>([]);
  const [savedCaptures, setSavedCaptures] = useState<CaptureItem[]>([]);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [recordWithEffects, setRecordWithEffects] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [effect, setEffect] = useState<EffectMode>('none');
  const [trackCaps, setTrackCaps] = useState<VideoTrackCaps>({});
  const [zoom, setZoom] = useState<number | null>(null);
  const [torch, setTorch] = useState(false);
  const [cameraPermissionState, setCameraPermissionState] = useState<PermissionState | 'unknown'>('unknown');

  const hasMediaSupport = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  const hasMediaRecorder = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';
  const hasImageCapture = typeof window !== 'undefined' && typeof (window as any).ImageCapture !== 'undefined';

  const { supported: opfsSupported, getDir, listFiles, writeFile, deleteFile } = useOPFS();

  const stopTracks = useCallback((target: MediaStream | null) => {
    if (!target) return;
    target.getTracks().forEach((track) => track.stop());
  }, []);

  const stopStream = useCallback(() => {
    stopTracks(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  }, [stopTracks]);

  const loadDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    setDevices(all.filter((d) => d.kind === 'videoinput'));
  }, []);

  const loadPersistedFiles = useCallback(async () => {
    if (!opfsSupported) {
      setSavedCaptures([]);
      return;
    }
    const dir = await getDir('Media/Camera', { create: true });
    if (!dir) return;

    persistedUrlRef.current.forEach((url) => URL.revokeObjectURL(url));
    persistedUrlRef.current = [];

    const handles = await listFiles(dir);
    const files = await Promise.all(
      handles.map(async (handle) => {
        const file = await handle.getFile();
        const url = URL.createObjectURL(file);
        persistedUrlRef.current.push(url);
        const isVideo = file.type.startsWith('video/') || /\.webm$/i.test(file.name);
        return {
          id: `persisted-${file.name}`,
          name: file.name,
          type: isVideo ? ('video' as const) : ('photo' as const),
          url,
          persisted: true,
          createdAt: new Date(file.lastModified).toISOString(),
        };
      }),
    );

    files.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    setSavedCaptures(files);
  }, [getDir, listFiles, opfsSupported]);

  const applyTrackCapabilities = useCallback((activeStream: MediaStream | null) => {
    const videoTrack = activeStream?.getVideoTracks()[0];
    if (!videoTrack) {
      setTrackCaps({});
      setZoom(null);
      setTorch(false);
      return;
    }
    const capabilities = ((videoTrack as MediaStreamTrack & { getCapabilities?: () => VideoTrackCaps }).getCapabilities?.() ||
      {}) as VideoTrackCaps;
    setTrackCaps(capabilities);

    const settings = videoTrack.getSettings() as MediaTrackSettings & { zoom?: number; torch?: boolean };
    if (typeof settings.zoom === 'number') {
      setZoom(settings.zoom);
    } else if (capabilities.zoom?.min !== undefined) {
      setZoom(capabilities.zoom.min);
    }

    setTorch(Boolean(settings.torch));
  }, []);

  const startStream = useCallback(
    async (deviceId?: string) => {
      if (!hasMediaSupport) {
        setStatus('error');
        setError('Camera APIs are not available in this browser.');
        return;
      }

      const requestId = ++requestIdRef.current;
      setStatus('loading');
      setError(null);

      try {
        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: deviceId ? { exact: deviceId } : undefined,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: deviceId ? undefined : { ideal: 'environment' },
          },
          audio: mode === 'video' && audioEnabled,
        };

        const newStream = await navigator.mediaDevices.getUserMedia(constraints);

        if (requestId !== requestIdRef.current) {
          stopTracks(newStream);
          return;
        }

        stopTracks(streamRef.current);
        streamRef.current = newStream;

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          await videoRef.current.play();
        }

        applyTrackCapabilities(newStream);
        await loadDevices();
        const id = newStream.getVideoTracks()[0]?.getSettings().deviceId;
        if (id) setActiveDeviceId(id);
        setStatus('streaming');
        setLiveMessage('Camera is live.');
      } catch (err) {
        const mapped = mapDomError(err);
        setStatus('error');
        setError(`${mapped.title} ${mapped.hint}`);
      }
    },
    [applyTrackCapabilities, audioEnabled, hasMediaSupport, loadDevices, mode, stopTracks],
  );

  const applyTrackSettings = useCallback(async () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    const constraints: MediaTrackConstraints & { zoom?: number; torch?: boolean } = {};
    if (trackCaps.zoom && zoom !== null) {
      constraints.zoom = zoom;
    }
    if (trackCaps.torch) {
      constraints.torch = torch;
    }
    if (Object.keys(constraints).length > 0) {
      try {
        await (videoTrack as MediaStreamTrack & { applyConstraints: (c: MediaTrackConstraints) => Promise<void> }).applyConstraints(
          { advanced: [constraints] },
        );
      } catch {
        setLiveMessage('Some camera controls are unsupported on this device.');
      }
    }
  }, [torch, trackCaps.torch, trackCaps.zoom, zoom]);

  useEffect(() => {
    void applyTrackSettings();
  }, [applyTrackSettings]);

  const drawEffectFrame = useCallback(
    (context: CanvasRenderingContext2D, source: CanvasImageSource, width: number, height: number, now: number, mirror: boolean) => {
      context.save();
      context.clearRect(0, 0, width, height);
      if (mirror) {
        context.translate(width, 0);
        context.scale(-1, 1);
      }

      let filter = 'none';
      if (effect === 'noir') filter = 'grayscale(100%) contrast(180%)';
      if (effect === 'night-vision') filter = 'grayscale(70%) contrast(135%) saturate(120%)';
      if (effect === 'vhs') filter = 'contrast(115%) saturate(85%) blur(0.6px)';
      if (effect === 'cyberpunk') filter = 'saturate(175%) hue-rotate(310deg) contrast(120%)';
      context.filter = filter;

      if (effect === 'pixelate') {
        const pixel = 8;
        const temp = captureCanvasRef.current || document.createElement('canvas');
        temp.width = Math.max(1, Math.floor(width / pixel));
        temp.height = Math.max(1, Math.floor(height / pixel));
        const tctx = temp.getContext('2d');
        if (tctx) {
          tctx.drawImage(source, 0, 0, temp.width, temp.height);
          context.imageSmoothingEnabled = false;
          context.drawImage(temp, 0, 0, temp.width, temp.height, 0, 0, width, height);
          context.restore();
          return;
        }
      } else {
        context.drawImage(source, 0, 0, width, height);
      }

      if (effect === 'night-vision') {
        context.fillStyle = 'rgba(10, 255, 70, 0.15)';
        context.fillRect(0, 0, width, height);
        for (let i = 0; i < 40; i += 1) {
          const x = Math.random() * width;
          const y = Math.random() * height;
          context.fillStyle = `rgba(140,255,180,${Math.random() * 0.08})`;
          context.fillRect(x, y, 2, 2);
        }
        const gradient = context.createRadialGradient(width / 2, height / 2, width * 0.1, width / 2, height / 2, width * 0.7);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }

      if (effect === 'vhs') {
        context.fillStyle = 'rgba(255,255,255,0.08)';
        for (let y = 0; y < height; y += 4) {
          context.fillRect(0, y, width, 1);
        }
        context.fillStyle = 'rgba(255,255,255,0.4)';
        context.font = '12px monospace';
        context.fillText(new Date(now).toLocaleString(), 8, height - 12);
      }

      if (effect === 'glitch' && now % 1200 < 200) {
        const sliceHeight = Math.max(8, Math.floor(height * 0.08));
        const y = Math.floor((now % height) / 1.8);
        const shift = Math.floor(Math.sin(now / 40) * 18);
        context.drawImage(context.canvas, 0, y, width, sliceHeight, shift, y, width, sliceHeight);
      }

      context.restore();
    },
    [effect],
  );

  useEffect(() => {
    const loop = () => {
      if (status === 'streaming' && videoRef.current && previewCanvasRef.current) {
        const video = videoRef.current;
        const canvas = previewCanvasRef.current;
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        if (canvas.width !== width) canvas.width = width;
        if (canvas.height !== height) canvas.height = height;
        const context = canvas.getContext('2d');
        if (context) {
          drawEffectFrame(context, video, width, height, performance.now(), isPreviewMirrored);
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [drawEffectFrame, isPreviewMirrored, status]);

  const persistCapture = useCallback(
    async (filename: string, blob: Blob) => {
      if (!opfsSupported) return false;
      const dir = await getDir('Media/Camera', { create: true });
      if (!dir) return false;
      const wrote = await writeFile(filename, blob, dir);
      if (!wrote) return false;
      await loadPersistedFiles();
      return true;
    },
    [getDir, loadPersistedFiles, opfsSupported, writeFile],
  );

  const addSessionCapture = useCallback(
    (capture: Omit<CaptureItem, 'id' | 'persisted'>) => {
      setSessionCaptures((previous) => [{ ...capture, id: `session-${Date.now()}-${Math.random()}`, persisted: false }, ...previous]);
    },
    [],
  );

  const capturePhotoBlob = useCallback(async (): Promise<Blob | null> => {
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video) return null;

    const videoTrack = stream.getVideoTracks()[0];

    if (effect === 'none' && !mirrorSelfieCapture && hasImageCapture && videoTrack) {
      try {
        const imageCapture = new (window as any).ImageCapture(videoTrack);
        const blob = await imageCapture.takePhoto();
        return blob;
      } catch {
        // fall through to canvas.
      }
    }

    const canvas = captureCanvasRef.current || document.createElement('canvas');
    captureCanvasRef.current = canvas;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    drawEffectFrame(context, video, width, height, performance.now(), mirrorSelfieCapture);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }, [drawEffectFrame, effect, hasImageCapture, mirrorSelfieCapture]);

  const completePhotoCapture = useCallback(async () => {
    const blob = await capturePhotoBlob();
    if (!blob) return;
    const stamp = formatDateStamp(new Date());
    const name = `IMG_${stamp}.png`;
    const persisted = await persistCapture(name, blob);

    if (!persisted) {
      const url = URL.createObjectURL(blob);
      sessionUrlRef.current.push(url);
      addSessionCapture({
        name,
        type: 'photo',
        url,
        createdAt: new Date().toISOString(),
      });
      setLiveMessage('Photo captured for this session. Use Download to save locally.');
      return;
    }

    setLiveMessage('Photo saved to Files > Media/Camera.');
  }, [addSessionCapture, capturePhotoBlob, persistCapture]);

  const cancelCountdown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(0);
    setLiveMessage('Countdown canceled.');
  }, []);

  const handleCapturePhoto = useCallback(async () => {
    if (status !== 'streaming') return;
    if (timerOption === 0) {
      await completePhotoCapture();
      return;
    }

    setCountdown(timerOption);
    setLiveMessage(`Capture in ${timerOption} seconds.`);
    timerRef.current = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          void completePhotoCapture();
          return 0;
        }
        setLiveMessage(`Capture in ${previous - 1} seconds.`);
        return previous - 1;
      });
    }, 1000);
  }, [completePhotoCapture, status, timerOption]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === 'paused') {
      recorder.resume();
    }
    if (recorder.state !== 'inactive') {
      recorder.stop();
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!hasMediaRecorder || !streamRef.current || isRecording) return;

    let targetStream = streamRef.current;
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    if (recordWithEffects && previewCanvasRef.current) {
      const effectStream = previewCanvasRef.current.captureStream(30);
      if (audioEnabled) {
        streamRef.current.getAudioTracks().forEach((track) => effectStream.addTrack(track));
      }
      targetStream = effectStream;
    }

    const recorder = new MediaRecorder(targetStream, { mimeType });
    recorderChunksRef.current = [];
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        recorderChunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recorderChunksRef.current, { type: recorder.mimeType || 'video/webm' });
      const ext = recorder.mimeType.includes('webm') ? 'webm' : 'dat';
      const stamp = formatDateStamp(new Date());
      const name = `VID_${stamp}.${ext}`;
      void persistCapture(name, blob).then((persisted) => {
        if (persisted) {
          setLiveMessage('Recording saved to Files > Media/Camera.');
          return;
        }

        const url = URL.createObjectURL(blob);
        sessionUrlRef.current.push(url);
        addSessionCapture({
          name,
          type: 'video',
          url,
          createdAt: new Date().toISOString(),
        });
        setLiveMessage('Recording kept for this session. Use Download to save locally.');
      });
      setIsRecording(false);
      setIsPaused(false);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setIsPaused(false);
    setLiveMessage('Recording started.');
  }, [addSessionCapture, audioEnabled, hasMediaRecorder, isRecording, persistCapture, recordWithEffects]);

  const togglePause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recorder.state === 'recording' && typeof recorder.pause === 'function') {
      recorder.pause();
      setIsPaused(true);
      setLiveMessage('Recording paused.');
      return;
    }
    if (recorder.state === 'paused' && typeof recorder.resume === 'function') {
      recorder.resume();
      setIsPaused(false);
      setLiveMessage('Recording resumed.');
    }
  }, []);

  const startCameraFromAction = useCallback(async () => {
    await startStream(activeDeviceId || undefined);
  }, [activeDeviceId, startStream]);

  const handleDelete = useCallback(
    async (capture: CaptureItem) => {
      URL.revokeObjectURL(capture.url);
      if (!capture.persisted) {
        setSessionCaptures((prev) => prev.filter((item) => item.id !== capture.id));
        return;
      }
      const dir = await getDir('Media/Camera', { create: true });
      if (!dir) return;
      await deleteFile(capture.name, dir);
      await loadPersistedFiles();
    },
    [deleteFile, getDir, loadPersistedFiles],
  );

  useEffect(() => {
    void loadPersistedFiles();
  }, [loadPersistedFiles]);

  useEffect(() => {
    const onDeviceChange = () => {
      void loadDevices();
    };

    if (navigator.mediaDevices) {
      navigator.mediaDevices.ondevicechange = onDeviceChange;
    }
    navigator.mediaDevices?.addEventListener?.('devicechange', onDeviceChange);
    return () => {
      if (navigator.mediaDevices && navigator.mediaDevices.ondevicechange === onDeviceChange) {
        navigator.mediaDevices.ondevicechange = null;
      }
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDeviceChange);
    };
  }, [loadDevices]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;

    let mounted = true;
    let permissionStatus: PermissionStatus | null = null;

    const syncPermissionState = async () => {
      try {
        permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (!mounted) return;

        const nextState = permissionStatus.state;
        setCameraPermissionState(nextState);

        permissionStatus.onchange = () => {
          const currentState = permissionStatus?.state ?? 'prompt';
          setCameraPermissionState(currentState);
          if (currentState === 'granted') {
            setError(null);
            setLiveMessage('Camera permission granted. Start camera to connect.');
            void loadDevices();
          }
        };
      } catch {
        setCameraPermissionState('unknown');
      }
    };

    void syncPermissionState();

    return () => {
      mounted = false;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [loadDevices]);

  useEffect(() => {
    const sessionUrls = sessionUrlRef.current;
    const persistedUrls = persistedUrlRef.current;
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopRecording();
      stopStream();
      [...sessionUrls, ...persistedUrls].forEach((url) => URL.revokeObjectURL(url));
    };
  }, [stopRecording, stopStream]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (countdown > 0) {
          cancelCountdown();
          return;
        }
        if (isRecording) {
          stopRecording();
          return;
        }
        if (status === 'streaming') {
          stopStream();
        }
        return;
      }

      if (event.key === ' ' && mode === 'photo' && status === 'streaming') {
        event.preventDefault();
        void handleCapturePhoto();
      }

      if (event.key.toLowerCase() === 'r' && mode === 'video' && status === 'streaming') {
        event.preventDefault();
        if (isRecording) stopRecording();
        else startRecording();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [cancelCountdown, countdown, handleCapturePhoto, isRecording, mode, startRecording, status, stopRecording, stopStream]);

  const allCaptures = useMemo(() => [...sessionCaptures, ...savedCaptures], [savedCaptures, sessionCaptures]);

  const videoUnavailableMessage = hasMediaRecorder ? null : 'Video mode is unavailable in this browser (MediaRecorder missing).';

  const openInFiles = () => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: { id: 'files', path: 'Media/Camera' } }));
  };

  const canPause = !!mediaRecorderRef.current && typeof mediaRecorderRef.current.pause === 'function';

  return (
    <div className="flex h-full w-full flex-col bg-[#0f1115] text-slate-100">
      <div className="sr-only" aria-live="polite">
        {liveMessage} {countdown > 0 ? `Countdown ${countdown}` : ''}
      </div>

      <div className="mx-auto flex h-full w-full max-w-6xl flex-1 flex-col overflow-hidden p-4">
        <section className="mx-auto flex h-full w-full max-w-5xl flex-1 overflow-hidden rounded-2xl border border-black/15 bg-[#d7d9dd] shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
          <div className="flex h-full w-full flex-col">
            <div className="flex items-center justify-between border-b border-black/10 bg-[#ececec] px-3 py-2 text-sm text-slate-700">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-amber-300" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <span className="text-sm font-semibold">Photo Booth</span>
              <button className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50" onClick={openInFiles}>
                Open Files
              </button>
            </div>

            <div className="flex items-center justify-between border-b border-black/10 bg-[#f6f7f9] px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                <button
                  aria-label="Start camera"
                  className="rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-60"
                  onClick={() => void startCameraFromAction()}
                  disabled={status === 'loading'}
                >
                  Start Camera
                </button>
                <button aria-label="Stop camera" className="rounded-md bg-slate-200 px-3 py-1.5 text-sm text-slate-700" onClick={stopStream}>
                  Stop
                </button>
              </div>

              <div className="flex items-center gap-2">
                {status === 'streaming' && <span className="rounded-full bg-emerald-400 px-2 py-0.5 text-xs font-semibold text-black">Live</span>}
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden bg-[linear-gradient(45deg,#e5e7eb_25%,transparent_25%),linear-gradient(-45deg,#e5e7eb_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e5e7eb_75%),linear-gradient(-45deg,transparent_75%,#e5e7eb_75%)] bg-[length:28px_28px] bg-[position:0_0,0_14px,14px_-14px,-14px_0] p-4">
              <div className="relative h-full w-full overflow-hidden rounded-2xl border border-black/10 bg-black">
                <video ref={videoRef} playsInline autoPlay muted aria-label="Camera source feed" className="hidden" />
                <canvas ref={previewCanvasRef} aria-label="Camera preview" className="h-full w-full object-cover" />
                {showGrid && (
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,transparent_32%,rgba(255,255,255,0.24)_33%,transparent_34%,transparent_65%,rgba(255,255,255,0.24)_66%,transparent_67%),linear-gradient(to_bottom,transparent_32%,rgba(255,255,255,0.24)_33%,transparent_34%,transparent_65%,rgba(255,255,255,0.24)_66%,transparent_67%)]" />
                )}
                {countdown > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45">
                    <span className="text-6xl font-bold text-white">{countdown}</span>
                    <button className="rounded bg-red-500 px-4 py-1 text-sm font-semibold text-black" onClick={cancelCountdown}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {error && <div className="border-t border-red-500/40 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
            {cameraPermissionState === 'denied' && (
              <div className="border-t border-amber-400/60 bg-amber-50 px-4 py-2 text-xs text-amber-900">
                Camera access is blocked in browser/site settings. Allow camera access, then click “Start Camera”.
              </div>
            )}
            {videoUnavailableMessage && <div className="border-t border-yellow-500/60 bg-yellow-50 px-4 py-2 text-xs text-yellow-900">{videoUnavailableMessage}</div>}

            <div className="grid gap-3 border-t border-black/10 bg-[#c6d4c8] px-3 py-3 lg:grid-cols-[220px_1fr_220px] lg:items-end">
              <aside className="order-2 lg:order-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700">Recent shots</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allCaptures.length === 0 && <p className="text-xs text-slate-600">No captures yet.</p>}
                  {allCaptures.slice(0, 6).map((item) => (
                    <div key={item.id} className="group relative h-16 w-20 flex-none overflow-hidden rounded border border-black/20 bg-black/70">
                      {item.type === 'photo' ? (
                        <img src={item.url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <video src={item.url} aria-label={item.name} className="h-full w-full object-cover" />
                      )}
                      <a
                        className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-center text-[10px] text-white opacity-0 transition group-hover:opacity-100"
                        href={item.url}
                        download={item.name}
                      >
                        Save
                      </a>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="order-1 flex items-center justify-center lg:order-2">
                {mode === 'photo' ? (
                  <button
                    className="h-16 w-16 rounded-full border-4 border-red-200 bg-red-500 text-sm font-semibold text-white shadow"
                    onClick={() => void handleCapturePhoto()}
                    disabled={status !== 'streaming'}
                  >
                    Shoot
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full bg-red-500 px-5 py-2 font-semibold text-white disabled:opacity-50"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={status !== 'streaming' || !hasMediaRecorder}
                    >
                      {isRecording ? 'Stop' : 'Record'}
                    </button>
                    <button className="rounded-full bg-slate-100 px-4 py-2 text-slate-700 disabled:opacity-50" disabled={!isRecording || !canPause} onClick={togglePause}>
                      {isPaused ? 'Resume' : 'Pause'}
                    </button>
                  </div>
                )}
              </div>

              <details className="order-3 rounded-lg border border-black/15 bg-white/70 p-2 text-sm" open>
                <summary className="cursor-pointer rounded bg-white px-2 py-1 text-right font-semibold text-slate-700">Effects & Controls</summary>
                <div className="mt-2 grid gap-2 text-slate-700">
                  <label className="flex flex-col gap-1">
                    Capture mode
                    <select
                      aria-label="Capture mode"
                      className="rounded border border-black/15 bg-white px-2 py-1.5"
                      value={mode}
                      onChange={(event) => {
                        const nextMode = event.target.value as CaptureMode;
                        if (nextMode === 'video' && !hasMediaRecorder) return;
                        setMode(nextMode);
                      }}
                    >
                      <option value="photo">Still</option>
                      <option value="video" disabled={!hasMediaRecorder}>
                        Clip
                      </option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    Camera source
                    <select
                      className="rounded border border-black/15 bg-white px-2 py-1.5"
                      value={activeDeviceId}
                      onChange={(event) => {
                        const id = event.target.value;
                        setActiveDeviceId(id);
                        void startStream(id || undefined);
                      }}
                    >
                      <option value="">Default</option>
                      {devices.map((device, index) => (
                        <option key={device.deviceId} value={device.deviceId}>
                          {device.label || `Camera ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    Effects
                    <select className="rounded border border-black/15 bg-white px-2 py-1.5" value={effect} onChange={(event) => setEffect(event.target.value as EffectMode)}>
                      {EFFECT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {mode === 'photo' && (
                    <label className="flex flex-col gap-1">
                      Timer
                      <select
                        className="rounded border border-black/15 bg-white px-2 py-1.5"
                        value={timerOption}
                        onChange={(event) => setTimerOption(Number(event.target.value) as TimerOption)}
                      >
                        <option value={0}>Off</option>
                        <option value={3}>3s</option>
                        <option value={10}>10s</option>
                      </select>
                    </label>
                  )}

                  <button className="rounded bg-slate-200 px-2 py-1 text-left" aria-label="Toggle mirror preview" aria-pressed={isPreviewMirrored} onClick={() => setIsPreviewMirrored((prev) => !prev)}>
                    Mirror preview: {isPreviewMirrored ? 'On' : 'Off'}
                  </button>
                  <button className="rounded bg-slate-200 px-2 py-1 text-left" aria-label="Toggle mirror selfie captures" aria-pressed={mirrorSelfieCapture} onClick={() => setMirrorSelfieCapture((prev) => !prev)}>
                    Mirror selfie captures: {mirrorSelfieCapture ? 'On' : 'Off'}
                  </button>
                  <button className="rounded bg-slate-200 px-2 py-1 text-left" aria-label="Toggle grid overlay" aria-pressed={showGrid} onClick={() => setShowGrid((prev) => !prev)}>
                    Grid overlay: {showGrid ? 'On' : 'Off'}
                  </button>

                  {trackCaps.zoom && zoom !== null && (
                    <label className="flex flex-col gap-1">
                      Zoom
                      <input
                        aria-label="Zoom level"
                        type="range"
                        min={trackCaps.zoom.min ?? 1}
                        max={trackCaps.zoom.max ?? 4}
                        step={trackCaps.zoom.step ?? 0.1}
                        value={zoom}
                        onChange={(event) => setZoom(Number(event.target.value))}
                      />
                    </label>
                  )}

                  {trackCaps.torch && (
                    <button className="rounded bg-slate-200 px-2 py-1 text-left" aria-label="Toggle torch" aria-pressed={torch} onClick={() => setTorch((prev) => !prev)}>
                      Torch: {torch ? 'On' : 'Off'}
                    </button>
                  )}

                  {mode === 'video' && (
                    <>
                      <button className="rounded bg-slate-200 px-2 py-1 text-left" aria-label="Toggle audio" aria-pressed={audioEnabled} onClick={() => setAudioEnabled((prev) => !prev)}>
                        Audio: {audioEnabled ? 'On' : 'Off'}
                      </button>
                      <button
                        className="rounded bg-slate-200 px-2 py-1 text-left"
                        aria-label="Toggle record with effects"
                        aria-pressed={recordWithEffects}
                        onClick={() => setRecordWithEffects((prev) => !prev)}
                      >
                        Record with effects: {recordWithEffects ? 'On' : 'Off'}
                      </button>
                    </>
                  )}
                </div>
              </details>
            </div>

            <div className="flex items-center gap-2">
              {allCaptures.slice(6).map((item) => (
                <a key={item.id} className="rounded bg-black/10 px-2 py-1 text-xs text-slate-700 hover:bg-black/20" href={item.url} download={item.name}>
                  Download {item.name}
                </a>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CameraApp;

export const displayCamera = () => <CameraApp />;
