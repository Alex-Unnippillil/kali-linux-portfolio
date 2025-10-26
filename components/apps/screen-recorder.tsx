import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import SelectionOverlay from './screen-recorder/SelectionOverlay';
import {
  Annotation,
  CaptureMode,
  SelectionRect,
  annotationReducer,
  createInitialAnnotationState,
} from './screen-recorder/annotations';
import useOPFS from '../../hooks/useOPFS';
import { ingestEvidenceRecord } from './evidence-vault/helpers';

const quickTagPresets = [
  'capture/screen',
  'status/triage',
  'severity/medium',
  'component/ui',
];

const createSessionId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  (target as HTMLElement | null)?.isContentEditable === true;

const triggerDownload = (name: string, blob: Blob) => {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl);
  return await response.blob();
};

const captureFrameFromStream = (stream: MediaStream): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.srcObject = stream;
    const cleanup = () => {
      video.pause();
      video.srcObject = null;
    };
    video.onloadedmetadata = () => {
      video.play().catch(() => {});
      requestAnimationFrame(() => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          cleanup();
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        cleanup();
        resolve(dataUrl);
      });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to capture frame'));
    };
  });
};

interface CaptureSession {
  id: string;
  mode: CaptureMode;
  startedAt: number;
  videoBlob?: Blob;
  annotations?: Annotation[];
  selection?: SelectionRect | null;
  frame?: string | null;
  regionImage?: string | null;
}

const ScreenRecorder: React.FC = () => {
  const [captureMode, setCaptureMode] = useState<CaptureMode>('screen');
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [regionPreview, setRegionPreview] = useState<string | null>(null);
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [session, setSession] = useState<CaptureSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const opfs = useOPFS();
  const [annotationState, dispatchAnnotation] = useReducer(
    annotationReducer,
    createInitialAnnotationState(),
  );

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      recorderRef.current?.stop();
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  const handleVideoCapture = useCallback(
    async (mode: CaptureMode) => {
      if (recording) {
        setStatus('Stop the current recording before starting a new one.');
        return;
      }
      setCaptureMode(mode);
      setRegionPreview(null);
      setSelection(null);
      dispatchAnnotation({ type: 'RESET' });
      setStatus('Requesting display capture…');
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: mode !== 'window',
        });
        streamRef.current = stream;
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
        recorderRef.current = recorder;
        chunksRef.current = [];
        const sessionId = createSessionId();
        setSession({ id: sessionId, mode, startedAt: Date.now() });
        setVideoUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          setVideoUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
          });
          setSession((prev) =>
            prev && prev.id === sessionId ? { ...prev, videoBlob: blob } : prev,
          );
          setRecording(false);
          stream.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          setStatus('Recording complete. Review and export when ready.');
        };
        recorder.onerror = () => {
          setRecording(false);
          setStatus('Recording error. Please try again.');
        };
        recorder.start();
        setRecording(true);
        setStatus('Recording in progress. Use the stop control when finished.');
      } catch (error) {
        setStatus('Screen capture request was cancelled.');
      }
    },
    [dispatchAnnotation, recording],
  );

  const handleStopRecording = useCallback(() => {
    if (!recording || !recorderRef.current) return;
    setStatus('Stopping recording…');
    recorderRef.current.stop();
  }, [recording]);

  const handleRegionCapture = useCallback(async () => {
    setCaptureMode('region');
    setRegionPreview(null);
    setSelection(null);
    dispatchAnnotation({ type: 'RESET' });
    setStatus('Preparing region capture…');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const frame = await captureFrameFromStream(stream);
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const sessionId = createSessionId();
      setSession({
        id: sessionId,
        mode: 'region',
        startedAt: Date.now(),
        frame,
      });
      setOverlayImage(frame);
      setShowOverlay(true);
      setStatus('Drag to mark the capture region, then press Enter to confirm.');
    } catch (error) {
      setStatus('Region capture cancelled.');
    }
  }, [dispatchAnnotation]);

  const handleStartCapture = useCallback(
    (mode: CaptureMode) => {
      if (mode === 'region') {
        handleRegionCapture();
      } else {
        handleVideoCapture(mode);
      }
    },
    [handleRegionCapture, handleVideoCapture],
  );

  const handleOverlayConfirm = useCallback(
    (result: {
      dataUrl: string;
      selection: SelectionRect | null;
      annotations: Annotation[];
    }) => {
      setShowOverlay(false);
      setRegionPreview(result.dataUrl);
      setSelection(result.selection);
      setStatus('Region captured. Export when ready.');
      setSession((prev) => {
        const base =
          prev && prev.mode === 'region'
            ? prev
            : {
                id: createSessionId(),
                mode: 'region' as CaptureMode,
                startedAt: Date.now(),
                frame: overlayImage,
              };
        return {
          ...base,
          annotations: result.annotations,
          selection: result.selection,
          regionImage: result.dataUrl,
          frame: base.frame ?? overlayImage,
        };
      });
    },
    [overlayImage],
  );

  const handleOverlayCancel = useCallback(() => {
    setShowOverlay(false);
    setStatus((prev) => prev ?? 'Region capture cancelled.');
  }, []);

  const handleOverlayModeHotkey = useCallback(
    (mode: CaptureMode) => {
      setShowOverlay(false);
      if (mode === 'region') {
        handleRegionCapture();
      } else {
        handleVideoCapture(mode);
      }
    },
    [handleRegionCapture, handleVideoCapture],
  );

  const toggleTag = useCallback((tag: string) => {
    setTags((prev) =>
      prev.includes(tag)
        ? prev.filter((value) => value !== tag)
        : [...prev, tag],
    );
  }, []);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((value) => value !== tag));
  }, []);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    setTags((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
    setTagInput('');
  }, [tagInput]);

  const readyToExport = useMemo(() => {
    if (!session) return false;
    return Boolean(session.videoBlob || session.regionImage);
  }, [session]);

  const handleExport = useCallback(async () => {
    if (!session) {
      setStatus('No capture session available yet.');
      return;
    }
    if (!session.videoBlob && !session.regionImage) {
      setStatus('Capture content before exporting.');
      return;
    }
    const timestamp = session.startedAt || Date.now();
    const folderName = new Date(timestamp).toISOString().replace(/:/g, '-');
    const folderPath = `evidence/screen-recorder/${folderName}`;
    const assets: {
      name: string;
      mimeType?: string;
      size?: number;
      path?: string;
      blob?: Blob;
    }[] = [];
    let dir: FileSystemDirectoryHandle | null = null;
    if (opfs.supported) {
      dir = await opfs.getDir(folderPath);
    }
    const persistFile = async (name: string, blob: Blob) => {
      if (dir) {
        const success = await opfs.writeFile(name, blob, dir);
        if (success) {
          assets.push({
            name,
            path: `${folderPath}/${name}`,
            mimeType: blob.type,
            size: blob.size,
            blob,
          });
          return;
        }
      }
      triggerDownload(name, blob);
      assets.push({ name, mimeType: blob.type, size: blob.size, blob });
    };
    try {
      if (session.videoBlob) {
        await persistFile('capture.webm', session.videoBlob);
      }
      if (session.regionImage) {
        const regionBlob = await dataUrlToBlob(session.regionImage);
        await persistFile('region.png', regionBlob);
      }
      const metadata = {
        mode: session.mode,
        tags,
        selection: session.selection,
        annotations: session.annotations,
        folderPath,
        startedAt: session.startedAt,
        exportedAt: Date.now(),
      };
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
        type: 'application/json',
      });
      await persistFile('metadata.json', metadataBlob);
      ingestEvidenceRecord({
        id: session.id,
        label: `Screen capture (${session.mode})`,
        tags,
        createdAt: Date.now(),
        assets,
        annotations: session.annotations,
        metadata,
        description:
          session.mode === 'region'
            ? 'Annotated region capture'
            : 'Display media recording',
      });
      setStatus(
        opfs.supported
          ? `Exported to ${folderPath}.`
          : 'Exported using browser downloads.',
      );
    } catch (error) {
      setStatus('Export failed. Please retry.');
    }
  }, [opfs, session, tags]);

  const reopenOverlay = useCallback(() => {
    if (!session?.frame) return;
    dispatchAnnotation({ type: 'SET', annotations: session.annotations || [] });
    setSelection(session.selection || null);
    setOverlayImage(session.frame);
    setShowOverlay(true);
    setCaptureMode('region');
    setStatus('Adjust annotations, then press Enter to save.');
  }, [session]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!event.shiftKey || isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const mapping: Record<string, CaptureMode> = {
        s: 'screen',
        w: 'window',
        r: 'region',
      };
      const mode = mapping[key];
      if (mode) {
        event.preventDefault();
        handleStartCapture(mode);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleStartCapture]);

  return (
    <div className="flex h-full w-full flex-col space-y-4 overflow-auto bg-ub-cool-grey p-4 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Screen Recorder</h2>
          <p className="text-xs text-ubt-lblue">
            Hotkeys: Shift+S screen, Shift+W window, Shift+R region, Enter to
            confirm, Esc to cancel overlay.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleStartCapture('screen')}
            disabled={recording}
            className={`rounded px-3 py-2 text-sm font-semibold transition ${
              recording
                ? 'cursor-not-allowed bg-gray-600 text-gray-300'
                : 'bg-ub-dracula hover:bg-ub-dracula-dark'
            }`}
          >
            Capture Screen
          </button>
          <button
            type="button"
            onClick={() => handleStartCapture('window')}
            disabled={recording}
            className={`rounded px-3 py-2 text-sm font-semibold transition ${
              recording
                ? 'cursor-not-allowed bg-gray-600 text-gray-300'
                : 'bg-ub-dracula hover:bg-ub-dracula-dark'
            }`}
          >
            Capture Window
          </button>
          <button
            type="button"
            onClick={() => handleStartCapture('region')}
            className="rounded bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-sky-400"
          >
            Capture Region
          </button>
          {recording && (
            <button
              type="button"
              onClick={handleStopRecording}
              className="rounded bg-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-500"
            >
              Stop
            </button>
          )}
        </div>
      </div>
      {status && (
        <div className="rounded border border-ubt-lblue/40 bg-ub-dracula/30 px-3 py-2 text-sm text-ubt-lblue">
          {status}
        </div>
      )}
      <section className="rounded border border-white/10 bg-black/30 p-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
          Evidence tags
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {quickTagPresets.map((tag) => {
            const active = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? 'bg-sky-500 text-slate-900 shadow'
                    : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add custom tag"
            className="w-48 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs focus:border-sky-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="rounded bg-ub-dracula px-3 py-1 text-xs font-semibold hover:bg-ub-dracula-dark"
          >
            Add
          </button>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-slate-800/80 px-3 py-1 text-xs text-slate-100"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-slate-400 hover:text-slate-200"
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {videoUrl && (
          <div className="rounded border border-white/10 bg-black/30 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Recording preview</h3>
              <span className="text-xs text-gray-400">{captureMode}</span>
            </div>
            <video
              src={videoUrl}
              controls
              className="mt-2 w-full rounded border border-slate-700"
            />
          </div>
        )}
        {regionPreview && (
          <div className="rounded border border-white/10 bg-black/30 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Annotated region</h3>
              <button
                type="button"
                onClick={reopenOverlay}
                className="text-xs text-sky-400 hover:underline"
              >
                Edit annotations
              </button>
            </div>
            <img
              src={regionPreview}
              alt="Annotated region preview"
              className="mt-2 max-h-80 w-full rounded border border-slate-700 object-contain"
            />
            {annotationState.annotations.length > 0 && (
              <p className="mt-2 text-xs text-gray-400">
                {annotationState.annotations.length} annotation(s) included.
              </p>
            )}
          </div>
        )}
      </section>
      <div className="mt-auto flex items-center justify-between rounded border border-white/10 bg-black/30 px-4 py-3">
        <div className="text-xs text-gray-300">
          Export bundles media, annotations, and metadata to the Evidence Vault.
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={!readyToExport}
          className={`rounded px-4 py-2 text-sm font-semibold transition ${
            readyToExport
              ? 'bg-sky-500 text-slate-900 hover:bg-sky-400'
              : 'cursor-not-allowed bg-gray-600 text-gray-300'
          }`}
        >
          Export to Evidence Vault
        </button>
      </div>
      {showOverlay && overlayImage && (
        <SelectionOverlay
          open={showOverlay}
          imageSrc={overlayImage}
          mode={captureMode}
          annotationState={annotationState}
          dispatch={dispatchAnnotation}
          selection={selection}
          onSelectionChange={setSelection}
          onClose={handleOverlayCancel}
          onConfirm={handleOverlayConfirm}
          onModeHotkey={handleOverlayModeHotkey}
        />
      )}
    </div>
  );
};

export default ScreenRecorder;

export const displayScreenRecorder = () => {
  return <ScreenRecorder />;
};
