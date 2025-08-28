import React, { useEffect, useRef } from 'react';
import Terminal from './archive/Terminal';

function TerminalApp(props) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const ctx = canvas.getContext('2d');
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor || !ctx) return;
    const audioCtx = new AudioCtor();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    oscillator.connect(analyser);
    analyser.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    audioCtx.resume();

    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = canvas.width / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth, barHeight);
      }
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      oscillator.stop();
      analyser.disconnect();
      gain.disconnect();
      audioCtx.close();
    };
  }, []);

  return (
    <div className="h-full w-full flex flex-col">
      <canvas ref={canvasRef} className="w-full h-24" />
      <Terminal {...props} />
    </div>
  );
}

export default TerminalApp;

export const displayTerminal = (addFolder, openApp) => (
  <TerminalApp addFolder={addFolder} openApp={openApp} />
);
