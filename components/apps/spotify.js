import React, { useEffect, useRef, useState } from 'react';

// Full bleed audio visualizer for the Spotify app
// Uses Web Audio API to draw a spectrum on a canvas
// Adds accessibility and performance considerations per Definition of Done

export default function SpotifyApp() {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const frameRef = useRef();
  const workerRef = useRef();
  const ctxRef = useRef(null);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Do not start the visualizer if user prefers reduced motion
    if (prefersReducedMotion) {
      return;
    }

    const audioEl = audioRef.current;
    audioEl.crossOrigin = 'anonymous';

    let analyser, source, bufferLength, dataArray;
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');

    let width, height;
    const handleResize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Web worker to compute average level off the main thread
    workerRef.current = new Worker(
      URL.createObjectURL(
        new Blob(
          [
            `self.onmessage = (e) => {
              const arr = e.data;
              let sum = 0;
              for (let i = 0; i < arr.length; i++) sum += arr[i];
              self.postMessage(sum / arr.length);
            };`
          ],
          { type: 'application/javascript' }
        )
      )
    );
    workerRef.current.onmessage = (e) =>
      setLevel(Math.round((e.data / 255) * 100));

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.fillStyle = '#000';
      canvasCtx.fillRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i];
        canvasCtx.fillStyle = '#39FF14'; // High contrast neon green
        canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }

      // Post data to worker for ARIA level computation
      workerRef.current.postMessage(Array.from(dataArray));

      frameRef.current = requestAnimationFrame(draw);
    };

    const start = async () => {
      if (ctxRef.current) return;
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = audioCtx;
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source = audioCtx.createMediaElementSource(audioEl);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      try {
        await audioEl.play();
      } catch {
        /* ignore */
      }
      frameRef.current = requestAnimationFrame(draw);
    };

    const handleVisibility = () => {
      if (!ctxRef.current) return;
      if (document.hidden) {
        audioEl.pause();
        cancelAnimationFrame(frameRef.current);
      } else {
        audioEl.play().catch(() => {});
        frameRef.current = requestAnimationFrame(draw);
      }
    };

    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
      document.removeEventListener('visibilitychange', handleVisibility);
      ctxRef.current?.close();
      analyser?.disconnect();
      source?.disconnect();
      workerRef.current?.terminate();
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-black text-white">
      <audio
        ref={audioRef}
        src="https://cdn.pixabay.com/download/audio/2021/09/06/audio_2b34bf4ad0a7a022beed579b3709271b?filename=birthday-sparks-15015.mp3"
        loop
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
      {/* Screen reader announcement of audio level */}
      <div className="sr-only" aria-live="polite">
        Audio level {level}%
      </div>
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

