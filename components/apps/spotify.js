import React, { useEffect, useRef, useState } from 'react';

// Full bleed audio visualizer for the Spotify app
// Uses Web Audio API to draw a spectrum on a canvas
// Adds accessibility and performance considerations per Definition of Done

export default function SpotifyApp() {
  const canvasRef = useRef(null);
  const audioRef = useRef(null);
  const frameRef = useRef();
  const workerRef = useRef();
  const [level, setLevel] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;

    const audioEl = audioRef.current;
    audioEl.crossOrigin = 'anonymous';

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    const source = audioCtx.createMediaElementSource(audioEl);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

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

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');

    const stop = () => {
      cancelAnimationFrame(frameRef.current);
      audioCtx.suspend();
    };

    const startDraw = () => {
      audioCtx.resume();
      frameRef.current = requestAnimationFrame(draw);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stop();
      } else if (!mql.matches) {
        startDraw();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleMotionChange = (e) => {
      if (e.matches) {
        stop();
      } else if (document.visibilityState === 'visible') {
        startDraw();
      }
    };
    mql.addEventListener('change', handleMotionChange);

    if (!mql.matches) frameRef.current = requestAnimationFrame(draw);

    return () => {
      stop();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      mql.removeEventListener('change', handleMotionChange);
      analyser.disconnect();
      source.disconnect();
      audioCtx.close();
      workerRef.current?.terminate();
    };
  }, [started]);

  const start = () => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) return;
    audioRef.current.play();
    setStarted(true);
  };

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
      {!started && (
        <button
          type="button"
          onClick={start}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-white px-4 py-2 font-semibold text-black"
        >
          Start visualization
        </button>
      )}
      {/* Screen reader announcement of audio level */}
      <div className="sr-only" aria-live="polite">
        Audio level {level}%
      </div>
    </div>
  );
}

export const displaySpotify = () => <SpotifyApp />;

