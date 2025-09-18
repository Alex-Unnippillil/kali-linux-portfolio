import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_RECORDING_PRESET,
  RECORDING_PRESETS,
  RecordingPresetId,
  formatEstimatedSize,
  getRecordingPreset,
} from '@/utils/capture/recordingPresets';
import {
  AudioLevelMonitor,
  ScreenAudioSource,
  ScreenRecorderHandle,
  attachPointerHighlights,
  startScreenRecording,
} from '@/modules/system/screenRecorder';

interface AudioOption {
  value: string;
  label: string;
  helper?: string;
}

const AUDIO_NONE_VALUE = 'none';
const AUDIO_SYSTEM_VALUE = 'system';
const AUDIO_MICROPHONE_PREFIX = 'microphone:';

function parseAudioSelection(value: string): ScreenAudioSource {
  if (value === AUDIO_NONE_VALUE) {
    return { type: 'none' };
  }
  if (value === AUDIO_SYSTEM_VALUE) {
    return { type: 'system' };
  }
  if (value.startsWith(AUDIO_MICROPHONE_PREFIX)) {
    const deviceId = value.slice(AUDIO_MICROPHONE_PREFIX.length);
    if (deviceId === 'default') {
      return { type: 'microphone' };
    }
    return { type: 'microphone', deviceId };
  }
  return { type: 'none' };
}

const RecorderPanel: React.FC = () => {
  const [presetId, setPresetId] = useState<RecordingPresetId>(DEFAULT_RECORDING_PRESET.id);
  const [audioSelection, setAudioSelection] = useState<string>(AUDIO_SYSTEM_VALUE);
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([]);
  const [isEnumerating, setIsEnumerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [cursorHighlight, setCursorHighlight] = useState(true);
  const [clickHighlight, setClickHighlight] = useState(true);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const audioMonitorRef = useRef<AudioLevelMonitor | null>(null);
  const audioMeterRafRef = useRef<number>();
  const highlightCleanupRef = useRef<(() => void) | null>(null);
  const recordingBlobRef = useRef<Blob | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const selectedPreset = useMemo(() => getRecordingPreset(presetId), [presetId]);
  const estimatedSizeLabel = useMemo(
    () => formatEstimatedSize(selectedPreset.estimatedSizePerMinute),
    [selectedPreset]
  );

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    let mounted = true;

    const loadDevices = async () => {
      try {
        setIsEnumerating(true);
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!mounted) return;
        setAudioInputs(devices.filter((device) => device.kind === 'audioinput'));
      } catch {
        if (mounted) setAudioInputs([]);
      } finally {
        if (mounted) setIsEnumerating(false);
      }
    };

    loadDevices();

    const handleDeviceChange = () => {
      loadDevices();
    };

    if (typeof navigator.mediaDevices.addEventListener === 'function') {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }

    return () => {
      mounted = false;
      if (typeof navigator.mediaDevices.removeEventListener === 'function') {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
    };
  }, []);

  useEffect(() => {
    if (highlightCleanupRef.current) {
      highlightCleanupRef.current();
      highlightCleanupRef.current = null;
    }

    if (!isRecording) {
      return undefined;
    }

    if (!cursorHighlight && !clickHighlight) {
      return undefined;
    }

    const cleanup = attachPointerHighlights({ cursor: cursorHighlight, clicks: clickHighlight });
    highlightCleanupRef.current = cleanup;

    return () => {
      cleanup();
      highlightCleanupRef.current = null;
    };
  }, [cursorHighlight, clickHighlight, isRecording]);

  useEffect(() => {
    if (!videoUrl) return undefined;
    return () => {
      URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  useEffect(() => {
    return () => {
      if (audioMeterRafRef.current) {
        cancelAnimationFrame(audioMeterRafRef.current);
      }
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        try {
          recorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      highlightCleanupRef.current?.();
    };
  }, []);

  const audioOptions = useMemo<AudioOption[]>(() => {
    const options: AudioOption[] = [
      { value: AUDIO_NONE_VALUE, label: 'No audio', helper: 'Video-only capture' },
      { value: AUDIO_SYSTEM_VALUE, label: 'System audio', helper: 'Capture tab or system output' },
    ];

    if (audioInputs.length > 0) {
      options.push({ value: `${AUDIO_MICROPHONE_PREFIX}default`, label: 'Microphone (default)' });
      audioInputs.forEach((device, index) => {
        options.push({
          value: `${AUDIO_MICROPHONE_PREFIX}${device.deviceId}`,
          label: device.label || `Microphone ${index + 1}`,
        });
      });
    } else {
      options.push({ value: `${AUDIO_MICROPHONE_PREFIX}default`, label: 'Microphone', helper: 'Prompt when recording starts' });
    }

    return options;
  }, [audioInputs]);

  const stopAudioMonitor = useCallback(() => {
    if (audioMeterRafRef.current) {
      cancelAnimationFrame(audioMeterRafRef.current);
      audioMeterRafRef.current = undefined;
    }
    audioMonitorRef.current = null;
    setAudioLevel(0);
  }, []);

  const startAudioMonitor = useCallback((monitor: AudioLevelMonitor | undefined) => {
    if (!monitor) {
      stopAudioMonitor();
      return;
    }
    audioMonitorRef.current = monitor;

    const updateLevel = () => {
      if (!audioMonitorRef.current) return;
      const level = audioMonitorRef.current.getLevel();
      setAudioLevel(level);
      audioMeterRafRef.current = requestAnimationFrame(updateLevel);
    };

    audioMeterRafRef.current = requestAnimationFrame(updateLevel);
  }, [stopAudioMonitor]);

  const resetStateForNewRecording = () => {
    chunksRef.current = [];
    setErrorMessage(null);
    stopAudioMonitor();
  };

  const startRecording = async () => {
    if (isRecording || isPreparing) return;
    setIsPreparing(true);
    resetStateForNewRecording();

    try {
      const recorderHandle: ScreenRecorderHandle = await startScreenRecording({
        preset: selectedPreset,
        audioSource: parseAudioSelection(audioSelection),
        cursorHighlight,
      });

      const { recorder, cleanup, audioMonitor } = recorderHandle;
      recorderRef.current = recorder;
      cleanupRef.current = cleanup;
      chunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        if (event.error) {
          setErrorMessage(event.error.message);
        } else {
          setErrorMessage('An unexpected recording error occurred.');
        }
        stopAudioMonitor();
        setIsRecording(false);
        chunksRef.current = [];
        cleanupRef.current?.();
        cleanupRef.current = null;
        recorderRef.current = null;
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        recordingBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setIsRecording(false);
        stopAudioMonitor();
        chunksRef.current = [];
        cleanupRef.current?.();
        cleanupRef.current = null;
        recorderRef.current = null;
      };

      try {
        recorder.start();
        if (videoUrl) {
          URL.revokeObjectURL(videoUrl);
          setVideoUrl(null);
        }
        recordingBlobRef.current = null;
        setIsRecording(true);
        startAudioMonitor(audioMonitor);
      } catch (startError) {
        if (startError instanceof Error) {
          setErrorMessage(startError.message);
        } else {
          setErrorMessage('Unable to start screen recording.');
        }
        stopAudioMonitor();
        cleanupRef.current?.();
        cleanupRef.current = null;
        recorderRef.current = null;
        return;
      }
    } catch (error) {
      if (error instanceof DOMException) {
        if (error.name === 'AbortError') {
          setErrorMessage('Screen capture was cancelled.');
        } else if (error.name === 'NotAllowedError') {
          setErrorMessage('Permission was denied for screen capture.');
        } else {
          setErrorMessage(error.message);
        }
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to start screen recording.');
      }
      stopAudioMonitor();
      cleanupRef.current?.();
      cleanupRef.current = null;
    } finally {
      setIsPreparing(false);
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;
    try {
      recorderRef.current.stop();
    } catch {
      // ignore
    }
  };

  const saveRecording = async () => {
    const blob = recordingBlobRef.current;
    if (!blob) return;
    const fileName = `screen-recording-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as typeof window & {
          showSaveFilePicker?: (options: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
        }).showSaveFilePicker?.({
          suggestedName: fileName,
          types: [
            {
              description: 'WebM video',
              accept: { 'video/webm': ['.webm'] },
            },
          ],
        });
        if (!handle) return;
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setErrorMessage('Saving was cancelled or failed.');
      }
      return;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const audioLevelPercentage = Math.round(audioLevel * 100);
  const showAudioMeter = audioSelection !== AUDIO_NONE_VALUE;

  return (
    <div className="flex h-full w-full flex-col bg-ub-cool-grey text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
        <div className="rounded-xl bg-black/20 p-6 shadow-lg shadow-black/30">
          <h1 className="text-2xl font-semibold">Screen Recorder</h1>
          <p className="mt-2 text-sm text-white/70">
            Choose capture quality, audio input, and highlight options before starting your recording.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl bg-black/20 p-5 shadow-lg shadow-black/30">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Quality preset</h2>
              <span className="text-sm font-medium text-ub-orange">{estimatedSizeLabel}</span>
            </div>
            <p className="mb-4 mt-1 text-xs text-white/60">Estimated size per minute and frame rate adjust automatically.</p>
            <div className="space-y-3">
              {RECORDING_PRESETS.map((preset) => {
                const checked = preset.id === presetId;
                return (
                  <label
                    key={preset.id}
                    className={`flex cursor-pointer gap-3 rounded-lg border border-white/10 p-3 transition hover:border-ub-orange/70 ${
                      checked ? 'bg-ub-dracula/60' : 'bg-black/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="recording-preset"
                      className="mt-1 h-4 w-4 text-ub-orange focus:ring-ub-orange"
                      checked={checked}
                      aria-label={preset.label}
                      onChange={() => setPresetId(preset.id)}
                    />
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{preset.label}</span>
                        <span className="text-xs text-white/60">
                          {preset.frameRate} fps · {Math.round(preset.videoBitsPerSecond / 1_000_000)} Mbps video
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/70">{preset.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl bg-black/20 p-5 shadow-lg shadow-black/30">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Audio source</h2>
              {isEnumerating && <span className="text-xs text-white/60">Scanning devices…</span>}
            </div>
            <p className="mb-3 mt-1 text-xs text-white/60">Pick a microphone or capture system audio from the shared tab or window.</p>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-white/60">Source</label>
              <select
                className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm focus:border-ub-orange focus:outline-none"
                value={audioSelection}
                onChange={(event) => setAudioSelection(event.target.value)}
              >
                {audioOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {audioOptions.find((option) => option.value === audioSelection)?.helper && (
                <p className="text-xs text-white/60">
                  {audioOptions.find((option) => option.value === audioSelection)?.helper}
                </p>
              )}
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Audio meter</span>
                <span>{showAudioMeter ? `${audioLevelPercentage}%` : 'Disabled'}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    showAudioMeter ? 'bg-emerald-400' : 'bg-white/20'
                  }`}
                  style={{ width: `${showAudioMeter ? Math.min(100, Math.max(4, audioLevelPercentage)) : 100}%` }}
                />
              </div>
              {!showAudioMeter && (
                <p className="mt-2 text-xs text-white/60">Enable an audio source to visualise input levels.</p>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-xl bg-black/20 p-5 shadow-lg shadow-black/30">
          <h2 className="text-lg font-semibold">Highlights</h2>
          <p className="mb-3 mt-1 text-xs text-white/60">
            Toggle cursor and click effects that overlay on the desktop while recording.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCursorHighlight((value) => !value)}
              className={`flex flex-col rounded-lg border border-white/10 p-4 text-left transition hover:border-ub-orange/70 ${
                cursorHighlight ? 'bg-ub-dracula/60' : 'bg-black/20'
              }`}
            >
              <span className="text-sm font-semibold">Cursor highlight</span>
              <span className="mt-1 text-xs text-white/60">
                Draws a soft halo around your pointer while the toggle is active.
              </span>
              <span className="mt-2 inline-flex w-fit items-center rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white">
                {cursorHighlight ? 'On' : 'Off'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setClickHighlight((value) => !value)}
              className={`flex flex-col rounded-lg border border-white/10 p-4 text-left transition hover:border-ub-orange/70 ${
                clickHighlight ? 'bg-ub-dracula/60' : 'bg-black/20'
              }`}
            >
              <span className="text-sm font-semibold">Click ripple</span>
              <span className="mt-1 text-xs text-white/60">
                Shows quick ripples for pointer clicks to spotlight interactions.
              </span>
              <span className="mt-2 inline-flex w-fit items-center rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white">
                {clickHighlight ? 'On' : 'Off'}
              </span>
            </button>
          </div>
        </section>

        <section className="rounded-xl bg-black/20 p-5 shadow-lg shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Controls</h2>
              <p className="text-xs text-white/60">
                {isRecording
                  ? 'Recording in progress. Stop when you are ready to review.'
                  : 'Press start to begin capturing your selected screen or window.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startRecording}
                disabled={isRecording || isPreparing}
                className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
                  isRecording || isPreparing
                    ? 'cursor-not-allowed bg-white/20 text-white/60'
                    : 'bg-ub-dracula hover:bg-ub-dracula-dark'
                }`}
              >
                {isPreparing ? 'Starting…' : 'Start recording'}
              </button>
              <button
                type="button"
                onClick={stopRecording}
                disabled={!isRecording}
                className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
                  isRecording ? 'bg-red-600 hover:bg-red-700' : 'cursor-not-allowed bg-white/20 text-white/60'
                }`}
              >
                Stop
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/70">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${
                cursorHighlight ? 'bg-ub-dracula/70 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              Cursor halo {cursorHighlight ? 'enabled' : 'off'}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 font-semibold ${
                clickHighlight ? 'bg-ub-dracula/70 text-white' : 'bg-white/10 text-white/60'
              }`}
            >
              Click ripples {clickHighlight ? 'enabled' : 'off'}
            </span>
            <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 font-semibold text-white/70">
              {selectedPreset.frameRate} fps target
            </span>
          </div>

          {errorMessage && (
            <div className="mt-4 rounded-lg border border-red-400/60 bg-red-500/20 px-4 py-3 text-sm text-red-100">
              {errorMessage}
            </div>
          )}
        </section>

        {videoUrl && (
          <section className="rounded-xl bg-black/20 p-5 shadow-lg shadow-black/30">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Preview</h2>
                <p className="text-xs text-white/60">Review your capture or download the WebM file.</p>
              </div>
              <button
                type="button"
                onClick={saveRecording}
                className="rounded-lg bg-ub-dracula px-4 py-2 text-sm font-semibold transition hover:bg-ub-dracula-dark"
              >
                Save recording
              </button>
            </div>
            <video
              src={videoUrl}
              controls
              className="mt-4 w-full rounded-lg border border-white/10"
              aria-label="Recorded screen preview"
            />
          </section>
        )}
      </div>
    </div>
  );
};

export default RecorderPanel;
