'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import InputOverlay from './screen-recorder/InputOverlay';
import { FrameMarker, OverlayEvent } from '../../types/overlay';
import { sanitizeIgnoreList } from '../../utils/overlay';
import { renderOverlayOnVideo } from '../../utils/overlayExport';

const DEFAULT_FRAME_RATE = 30;
const OVERLAY_DOWNLOAD = 'recording-overlay.webm';
const METADATA_DOWNLOAD = 'recording-overlay.json';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

function ScreenRecorder() {
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const videoUrlRef = useRef<string | null>(null);

  const [overlayEvents, setOverlayEvents] = useState<OverlayEvent[]>([]);
  const overlayEventsRef = useRef<OverlayEvent[]>([]);
  const [overlayOpacity, setOverlayOpacity] = useState(0.85);
  const [noiseThreshold, setNoiseThreshold] = useState(120);
  const [ignoredKeysInput, setIgnoredKeysInput] = useState('Meta');
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [showMouse, setShowMouse] = useState(true);
  const [overlayStart, setOverlayStart] = useState<number | null>(null);
  const overlayStartRef = useRef<number | null>(null);
  const [frameRate, setFrameRate] = useState(DEFAULT_FRAME_RATE);
  const frameRateRef = useRef(DEFAULT_FRAME_RATE);
  const [frameTimeline, setFrameTimeline] = useState<FrameMarker[]>([]);
  const frameTimelineRef = useRef<FrameMarker[]>([]);
  const frameLoopRef = useRef<number>();
  const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState('');

  const ignoreKeys = useMemo(
    () =>
      sanitizeIgnoreList(
        ignoredKeysInput
          .split(',')
          .map((key) => key.trim())
          .filter(Boolean),
      ),
    [ignoredKeysInput],
  );

  useEffect(() => {
    frameRateRef.current = frameRate;
  }, [frameRate]);

  const stopFrameLoop = useCallback(() => {
    if (frameLoopRef.current) {
      cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = undefined;
    }
  }, []);

  const startFrameLoop = useCallback(() => {
    frameTimelineRef.current = [];
    const loop = () => {
      if (overlayStartRef.current !== null) {
        const now = performance.now();
        const elapsed = now - overlayStartRef.current;
        const frameIndex = Math.round((elapsed / 1000) * frameRateRef.current);
        const last = frameTimelineRef.current[frameTimelineRef.current.length - 1];
        if (!last || last.frame !== frameIndex) {
          frameTimelineRef.current.push({ frame: frameIndex, time: elapsed });
        }
      }
      frameLoopRef.current = requestAnimationFrame(loop);
    };
    frameLoopRef.current = requestAnimationFrame(loop);
  }, []);

  const resetRecordingState = useCallback(() => {
    overlayEventsRef.current = [];
    setOverlayEvents([]);
    frameTimelineRef.current = [];
    setFrameTimeline([]);
    setExportStatus('');
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = null;
    }
    setVideoUrl(null);
    setVideoBlob(null);
  }, []);

  const handleOverlayRecord = useCallback((event: OverlayEvent) => {
    overlayEventsRef.current = [...overlayEventsRef.current, event];
    setOverlayEvents(overlayEventsRef.current);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings?.() ?? {};
      const rate =
        typeof settings.frameRate === 'number' && settings.frameRate > 0
          ? Math.round(settings.frameRate)
          : DEFAULT_FRAME_RATE;
      setFrameRate(rate);
      frameRateRef.current = rate;

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setVideoBlob(blob);
        if (videoUrlRef.current) {
          URL.revokeObjectURL(videoUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        videoUrlRef.current = url;
        setVideoUrl(url);
        stream.getTracks().forEach((trackItem) => trackItem.stop());
        overlayStartRef.current = null;
        setOverlayStart(null);
        stopFrameLoop();
        setFrameTimeline([...frameTimelineRef.current]);
        setRecording(false);
      };
      recorder.start();
      recorderRef.current = recorder;
      resetRecordingState();
      const start = performance.now();
      overlayStartRef.current = start;
      setOverlayStart(start);
      startFrameLoop();
      setRecordingStartedAt(Date.now());
      setRecording(true);
    } catch {
      // ignore permission denials or unsupported environments
    }
  };

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setRecording(false);
  }, []);

  const saveRecording = async () => {
    if (!videoBlob || !videoUrl) return;
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'recording.webm',
          types: [
            {
              description: 'WebM video',
              accept: { 'video/webm': ['.webm'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(videoBlob);
        await writable.close();
      } catch {
        // ignore user cancellation
      }
    } else {
      downloadBlob(videoBlob, 'recording.webm');
    }
  };

  const exportOverlayVideo = async () => {
    if (!videoBlob || overlayEventsRef.current.length === 0) return;
    setExportStatus('Rendering overlay…');
    try {
      const rendered = await renderOverlayOnVideo(videoBlob, overlayEventsRef.current, {
        frameRate: frameRateRef.current,
        opacity: overlayOpacity,
      });
      downloadBlob(rendered, OVERLAY_DOWNLOAD);
      setExportStatus('Overlay baked into exported video.');
    } catch (error) {
      console.error(error);
      downloadBlob(videoBlob, 'recording.webm');
      setExportStatus('Overlay rendering unavailable. Exported original recording.');
    }
  };

  const exportOverlayMetadata = () => {
    if (overlayEventsRef.current.length === 0) return;
    const payload = {
      recordedAt: recordingStartedAt,
      frameRate: frameRateRef.current,
      overlay: overlayEventsRef.current,
      frames: frameTimelineRef.current,
      settings: {
        opacity: overlayOpacity,
        noiseThreshold,
        ignoreKeys,
        showKeyboard,
        showMouse,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    downloadBlob(blob, METADATA_DOWNLOAD);
    setExportStatus('Overlay metadata exported.');
  };

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      stopFrameLoop();
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
    };
  }, [stopFrameLoop]);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-start space-y-6 bg-ub-cool-grey p-6 text-white">
      <InputOverlay
        recording={recording}
        frameRate={frameRate}
        startTime={overlayStart}
        opacity={overlayOpacity}
        ignoreKeys={ignoreKeys}
        noiseThreshold={noiseThreshold}
        showKeyboard={showKeyboard}
        showMouse={showMouse}
        onRecord={handleOverlayRecord}
      />
      <div className="flex flex-col items-center space-y-4">
        {!recording && (
          <button
            type="button"
            onClick={startRecording}
            className="rounded bg-ub-dracula px-4 py-2 hover:bg-ub-dracula-dark"
          >
            Start Recording
          </button>
        )}
        {recording && (
          <button
            type="button"
            onClick={stopRecording}
            className="rounded bg-red-600 px-4 py-2 hover:bg-red-700"
          >
            Stop Recording
          </button>
        )}
        {videoUrl && !recording && (
          <>
            <video src={videoUrl} controls className="max-w-full rounded border border-gray-700" />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={saveRecording}
                className="rounded bg-ub-dracula px-3 py-1 text-sm hover:bg-ub-dracula-dark"
              >
                Save Recording
              </button>
              <button
                type="button"
                onClick={exportOverlayVideo}
                disabled={overlayEvents.length === 0}
                className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-600/50"
              >
                Export With Overlay
              </button>
              <button
                type="button"
                onClick={exportOverlayMetadata}
                disabled={overlayEvents.length === 0}
                className="rounded bg-slate-600 px-3 py-1 text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-600/50"
              >
                Export Overlay Metadata
              </button>
            </div>
            {exportStatus && <p className="text-xs text-gray-300">{exportStatus}</p>}
          </>
        )}
      </div>

      <section className="w-full max-w-xl space-y-4 rounded-lg bg-black/40 p-4">
        <header>
          <h2 className="text-lg font-semibold">Overlay Settings</h2>
          <p className="text-xs text-gray-300">
            Adjust how keyboard combos and mouse clicks are displayed while recording.
          </p>
        </header>
        <div className="space-y-2">
          <label className="flex flex-col text-sm">
            <span className="mb-1">Overlay opacity ({overlayOpacity.toFixed(2)})</span>
            <input
              type="range"
              min={0.2}
              max={1}
              step={0.05}
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1">Noise filter window (ms)</span>
            <input
              type="number"
              min={0}
              max={1000}
              step={10}
              value={noiseThreshold}
              onChange={(e) => setNoiseThreshold(Math.max(0, Number(e.target.value) || 0))}
              className="rounded border border-gray-700 bg-gray-800 p-2"
            />
          </label>
          <label className="flex flex-col text-sm">
            <span className="mb-1">Ignore keys (comma separated)</span>
            <input
              type="text"
              value={ignoredKeysInput}
              onChange={(e) => setIgnoredKeysInput(e.target.value)}
              className="rounded border border-gray-700 bg-gray-800 p-2"
              placeholder="Meta, PrintScreen"
            />
          </label>
          <div className="flex flex-col gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showKeyboard}
                onChange={(e) => setShowKeyboard(e.target.checked)}
              />
              Show keyboard combos
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showMouse}
                onChange={(e) => setShowMouse(e.target.checked)}
              />
              Show mouse clicks
            </label>
          </div>
        </div>
      </section>

      {overlayEvents.length > 0 && (
        <section className="w-full max-w-xl rounded-lg bg-black/30 p-4 text-xs">
          <header className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Overlay timeline</h3>
            <span className="text-gray-300">{overlayEvents.length} events</span>
          </header>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {overlayEvents.slice(-20).map((event) => (
              <div key={event.id} className="flex justify-between gap-2">
                <span className="font-mono text-gray-100">{event.label}</span>
                <span className="text-gray-400">{(event.timestamp / 1000).toFixed(2)}s · f{event.frame}</span>
              </div>
            ))}
          </div>
          {frameTimeline.length > 0 && (
            <p className="mt-2 text-gray-400">
              Captured {frameTimeline.length} frame markers at approximately {frameRate} fps.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default ScreenRecorder;

export const displayScreenRecorder = () => {
  return <ScreenRecorder />;
};
