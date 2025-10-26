import { RecordingPreset } from '@/utils/capture/recordingPresets';

export type ScreenAudioSource =
  | { type: 'none' }
  | { type: 'system' }
  | { type: 'microphone'; deviceId?: string };

export interface ScreenRecorderOptions {
  preset: RecordingPreset;
  audioSource: ScreenAudioSource;
  cursorHighlight?: boolean;
}

export interface AudioLevelMonitor {
  getLevel: () => number;
  destroy: () => void | Promise<void>;
}

export interface ScreenRecorderHandle {
  recorder: MediaRecorder;
  stream: MediaStream;
  cleanup: () => void;
  audioMonitor?: AudioLevelMonitor;
}

export interface PointerHighlightOptions {
  cursor?: boolean;
  clicks?: boolean;
  accentColor?: string;
}

function ensureBrowserSupport() {
  if (typeof window === 'undefined') {
    throw new Error('Screen recording is unavailable in this environment.');
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('Screen capture APIs are not available in this browser.');
  }

  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not supported by this browser.');
  }
}

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }

  const candidates = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

function createMediaRecorder(stream: MediaStream, preset: RecordingPreset) {
  const mimeType = pickMimeType();
  const options: MediaRecorderOptions = {
    videoBitsPerSecond: preset.videoBitsPerSecond,
    audioBitsPerSecond: preset.audioBitsPerSecond,
  };

  if (mimeType) {
    options.mimeType = mimeType;
  }

  try {
    return new MediaRecorder(stream, options);
  } catch {
    return new MediaRecorder(stream);
  }
}

function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

function createAudioLevelMonitor(stream: MediaStream): AudioLevelMonitor | undefined {
  if (typeof window === 'undefined') return undefined;
  if (!stream.getAudioTracks().length) return undefined;

  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) return undefined;

  let context: AudioContext | undefined;
  try {
    context = new AudioContextClass();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    const dataArray = new Uint8Array(analyser.fftSize);

    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);

    return {
      getLevel: () => {
        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          const value = (dataArray[i] - 128) / 128;
          sumSquares += value * value;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        return Math.min(rms * 2, 1);
      },
      destroy: () => {
        try {
          source.disconnect();
        } catch {
          // ignore
        }
        try {
          analyser.disconnect();
        } catch {
          // ignore
        }
        context.close().catch(() => undefined);
      },
    };
  } catch {
    context?.close().catch(() => undefined);
    return undefined;
  }
}

export async function startScreenRecording(options: ScreenRecorderOptions): Promise<ScreenRecorderHandle> {
  ensureBrowserSupport();

  const { preset, audioSource, cursorHighlight } = options;
  const wantsSystemAudio = audioSource.type === 'system';
  const wantsMicrophone = audioSource.type === 'microphone';

  const videoConstraints: MediaTrackConstraints = {
    frameRate: { ideal: preset.frameRate, max: preset.frameRate },
    width: { ideal: preset.width, max: preset.width },
    height: { ideal: preset.height, max: preset.height },
    cursor: cursorHighlight ? 'always' : 'motion',
  };

  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: videoConstraints,
    audio: wantsSystemAudio
      ? {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      : false,
  });

  const streams: MediaStream[] = [displayStream];

  let microphoneStream: MediaStream | undefined;
  if (wantsMicrophone) {
    microphoneStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: audioSource.deviceId ? { exact: audioSource.deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    streams.push(microphoneStream);
  }

  const combinedStream = new MediaStream();
  displayStream.getVideoTracks().forEach((track) => {
    combinedStream.addTrack(track);
  });

  if (wantsSystemAudio) {
    displayStream.getAudioTracks().forEach((track) => {
      combinedStream.addTrack(track);
    });
  } else if (microphoneStream) {
    microphoneStream.getAudioTracks().forEach((track) => {
      combinedStream.addTrack(track);
    });
  }

  const recorder = createMediaRecorder(combinedStream, preset);

  const [primaryVideoTrack] = displayStream.getVideoTracks();
  const handleEnded = () => {
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
  };

  primaryVideoTrack?.addEventListener('ended', handleEnded);

  const audioMonitor = createAudioLevelMonitor(combinedStream);

  return {
    recorder,
    stream: combinedStream,
    audioMonitor,
    cleanup: () => {
      primaryVideoTrack?.removeEventListener('ended', handleEnded);
      streams.forEach((stream) => stopStream(stream));
      audioMonitor?.destroy();
    },
  };
}

let highlightOverlay: HTMLDivElement | null = null;

function ensureHighlightOverlay() {
  if (typeof document === 'undefined') return null;
  if (!highlightOverlay) {
    highlightOverlay = document.createElement('div');
    highlightOverlay.style.position = 'fixed';
    highlightOverlay.style.pointerEvents = 'none';
    highlightOverlay.style.left = '0';
    highlightOverlay.style.top = '0';
    highlightOverlay.style.width = '100%';
    highlightOverlay.style.height = '100%';
    highlightOverlay.style.zIndex = '999999';
    highlightOverlay.style.transition = 'opacity 150ms ease-out';
    document.body.appendChild(highlightOverlay);
  }
  return highlightOverlay;
}

function releaseHighlightOverlay() {
  if (highlightOverlay && highlightOverlay.childNodes.length === 0) {
    highlightOverlay.remove();
    highlightOverlay = null;
  }
}

export function attachPointerHighlights(options: PointerHighlightOptions) {
  if (typeof document === 'undefined') return () => undefined;
  const { cursor, clicks, accentColor = 'rgba(59, 130, 246, 0.45)' } = options;
  if (!cursor && !clicks) return () => undefined;

  const overlay = ensureHighlightOverlay();
  if (!overlay) return () => undefined;

  let cursorElement: HTMLDivElement | null = null;
  if (cursor) {
    cursorElement = document.createElement('div');
    cursorElement.style.position = 'absolute';
    cursorElement.style.width = '60px';
    cursorElement.style.height = '60px';
    cursorElement.style.borderRadius = '9999px';
    cursorElement.style.border = `2px solid ${accentColor}`;
    cursorElement.style.boxShadow = `0 0 0 6px ${accentColor}`;
    cursorElement.style.opacity = '0';
    cursorElement.style.transition = 'opacity 120ms ease-out, transform 80ms ease-out';
    cursorElement.style.transform = 'translate(-50%, -50%)';
    overlay.appendChild(cursorElement);
  }

  let hideTimeout: number | undefined;

  const handlePointerMove = (event: PointerEvent) => {
    if (!cursorElement) return;
    cursorElement.style.left = `${event.clientX}px`;
    cursorElement.style.top = `${event.clientY}px`;
    cursorElement.style.opacity = '1';
    if (hideTimeout) {
      window.clearTimeout(hideTimeout);
    }
    hideTimeout = window.setTimeout(() => {
      if (cursorElement) {
        cursorElement.style.opacity = '0.25';
      }
    }, 600);
  };

  const handlePointerLeave = () => {
    if (!cursorElement) return;
    cursorElement.style.opacity = '0';
  };

  const handleClick = (event: PointerEvent) => {
    if (!clicks) return;
    const ripple = document.createElement('div');
    ripple.style.position = 'absolute';
    ripple.style.left = `${event.clientX}px`;
    ripple.style.top = `${event.clientY}px`;
    ripple.style.width = '16px';
    ripple.style.height = '16px';
    ripple.style.borderRadius = '9999px';
    ripple.style.border = `2px solid ${accentColor}`;
    ripple.style.transform = 'translate(-50%, -50%) scale(0.4)';
    ripple.style.opacity = '0.85';
    ripple.style.transition = 'transform 280ms ease-out, opacity 280ms ease-out';
    overlay.appendChild(ripple);
    requestAnimationFrame(() => {
      ripple.style.transform = 'translate(-50%, -50%) scale(1.8)';
      ripple.style.opacity = '0';
    });
    window.setTimeout(() => {
      ripple.remove();
      releaseHighlightOverlay();
    }, 320);
  };

  if (cursorElement) {
    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerleave', handlePointerLeave, { passive: true });
  }

  if (clicks) {
    document.addEventListener('pointerdown', handleClick, { passive: true });
  }

  return () => {
    if (cursorElement) {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerleave', handlePointerLeave);
      cursorElement.remove();
      cursorElement = null;
    }
    if (clicks) {
      document.removeEventListener('pointerdown', handleClick);
    }
    if (hideTimeout) {
      window.clearTimeout(hideTimeout);
    }
    releaseHighlightOverlay();
  };
}
