import React, { useEffect, useRef, useState } from 'react';

const BluetoothApp = () => {
  const canvasRef = useRef(null);
  const workerRef = useRef(null);
  const animationRef = useRef(null);
  const devicesRef = useRef([]);
  const [devices, setDevices] = useState([]); // used only to redraw in reduced motion
  const ariaRef = useRef(null);
  const sweepRef = useRef(0);
  const prefersReduceRef = useRef(false);

  const drawStatic = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = (canvas.width = canvas.offsetWidth);
    const h = (canvas.height = canvas.offsetHeight);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy);
    devicesRef.current.forEach((d) => {
      const r = d.distance * radius;
      const x = cx + Math.cos(d.angle) * r;
      const y = cy + Math.sin(d.angle) * r;
      ctx.strokeStyle = '#39FF14';
      ctx.beginPath();
      ctx.arc(x, y, d.strength * 20 + 4, 0, Math.PI * 2);
      ctx.stroke();
    });
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = (canvas.width = canvas.offsetWidth);
    const h = (canvas.height = canvas.offsetHeight);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(cx, cy);

    sweepRef.current += 0.02;
    ctx.strokeStyle = '#39FF14';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(sweepRef.current) * radius,
      cy + Math.sin(sweepRef.current) * radius,
    );
    ctx.stroke();

    devicesRef.current.forEach((d) => {
      const r = d.distance * radius;
      const x = cx + Math.cos(d.angle) * r;
      const y = cy + Math.sin(d.angle) * r;
      ctx.fillStyle = '#39FF14';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(57,255,20,${1 - d.ring / (d.strength * radius + 1)})`;
      ctx.beginPath();
      ctx.arc(x, y, d.ring, 0, Math.PI * 2);
      ctx.stroke();

      d.ring += 2;
      if (d.ring > d.strength * radius) {
        d.ring = 0;
      }
    });

    animationRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handle = () => {
      prefersReduceRef.current = mq.matches;
      if (prefersReduceRef.current) {
        cancelAnimationFrame(animationRef.current);
        drawStatic();
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };
    handle();
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./worker.js', import.meta.url));
    workerRef.current.onmessage = (e) => {
      const dev = { ...e.data, ring: 0 };
      devicesRef.current.push(dev);
      if (ariaRef.current) {
        ariaRef.current.textContent = `${dev.name} detected`;
      }
      if (prefersReduceRef.current) {
        setDevices([...devicesRef.current]);
      }
    };
    workerRef.current.postMessage({ command: 'start' });
    return () => {
      workerRef.current.postMessage({ command: 'stop' });
      workerRef.current.terminate();
    };
  }, []);

  useEffect(() => {
    if (prefersReduceRef.current) {
      drawStatic();
    }
  }, [devices]);

  useEffect(() => {
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  return (
    <div className="h-full w-full bg-black text-white relative" aria-label="Bluetooth radar">
      <canvas ref={canvasRef} className="h-full w-full" />
      <div ref={ariaRef} aria-live="polite" className="sr-only" />
    </div>
  );
};

export default BluetoothApp;
export const displayBluetooth = () => <BluetoothApp />;
