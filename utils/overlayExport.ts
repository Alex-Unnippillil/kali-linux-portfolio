import { OverlayEvent } from '../types/overlay';

interface OverlayRenderOptions {
  frameRate: number;
  opacity: number;
  /** Duration in milliseconds for each event to stay visible */
  displayDuration?: number;
}

/**
 * Attempts to render overlay events on top of the recorded video by replaying
 * the media inside an offscreen canvas and recording the composed frames.
 */
export const renderOverlayOnVideo = async (
  videoBlob: Blob,
  events: OverlayEvent[],
  options: OverlayRenderOptions,
): Promise<Blob> => {
  if (typeof window === 'undefined') {
    throw new Error('Overlay rendering requires a browser environment.');
  }
  if (!('MediaRecorder' in window) || typeof HTMLCanvasElement.prototype.captureStream !== 'function') {
    throw new Error('Current environment does not support media composition.');
  }

  const { frameRate, opacity, displayDuration = 900 } = options;

  const video = document.createElement('video');
  video.src = URL.createObjectURL(videoBlob);
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Unable to load recorded video.'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create drawing context.');
  }

  const stream = canvas.captureStream(frameRate || 30);
  const recorder = new MediaRecorder(stream, {
    mimeType: 'video/webm;codecs=vp9',
  });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const result = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
    recorder.onerror = (e) => {
      reject(e.error || e);
    };
  });

  const visibleWindow = displayDuration;

  const drawOverlay = (currentMs: number) => {
    const active = events.filter((event) => {
      const startMs = (event.frame / frameRate) * 1000;
      return currentMs >= startMs && currentMs <= startMs + visibleWindow;
    });

    const padding = 12;
    const lineHeight = 24;
    active.slice(-6).forEach((event, index) => {
      const top = canvas.height - padding - (active.length - index) * (lineHeight + 8);
      const label = `${event.label}`;
      const meta = `${(event.timestamp / 1000).toFixed(2)}s • f${event.frame}`;
      ctx.font = '14px "Ubuntu", sans-serif';
      const labelWidth = ctx.measureText(label).width;
      ctx.font = '11px "Ubuntu", sans-serif';
      const metaWidth = ctx.measureText(meta).width;
      const width = Math.max(labelWidth, metaWidth) + padding * 2;
      const left = canvas.width - width - padding;
      ctx.fillStyle = `rgba(0,0,0,${0.7 * opacity})`;
      ctx.fillRect(left, top, width, lineHeight + 24);
      ctx.fillStyle = `rgba(255,255,255,${opacity})`;
      ctx.font = '14px "Ubuntu", sans-serif';
      ctx.fillText(label, left + padding, top + 18);
      ctx.fillStyle = `rgba(209,213,219,${opacity})`;
      ctx.font = '11px "Ubuntu", sans-serif';
      ctx.fillText(meta, left + padding, top + 32);
    });
  };

  const renderLoop = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawOverlay(video.currentTime * 1000);
    if (!video.paused && !video.ended) {
      requestAnimationFrame(renderLoop);
    }
  };

  recorder.start();

  await video.play();
  renderLoop();

  await new Promise<void>((resolve) => {
    const stop = () => {
      recorder.stop();
      resolve();
    };
    video.onended = stop;
    if (video.ended) {
      stop();
    }
  });

  URL.revokeObjectURL(video.src);
  return result;
};
