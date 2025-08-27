import React, { useEffect, useRef, useState } from 'react';

const DiscoveryMap = ({ trigger }) => {
  const canvasRef = useRef(null);
  const [ariaMessage, setAriaMessage] = useState('');
  const [stage, setStage] = useState('');
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handle = () => setPrefersReduced(mq.matches);
    handle();
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setStage('Discovery');

    const supportsWorker =
      typeof window !== 'undefined' &&
      window.Worker &&
      'OffscreenCanvas' in window;
    let worker;
    let animationFrame;

    if (supportsWorker) {
      worker = new Worker(new URL('./discovery.worker.js', import.meta.url));
      const offscreen = canvas.transferControlToOffscreen();
      const reduceMotion = window
        .matchMedia('(prefers-reduced-motion: reduce)')
        .matches;
      worker.postMessage(
        { type: 'init', canvas: offscreen, reduceMotion },
        [offscreen]
      );
      let discovered = 0;
      let scripted = 0;
      worker.onmessage = (e) => {
        const { message } = e.data || {};
        if (message) {
          setAriaMessage(message);
          if (message.startsWith('Host')) {
            discovered += 1;
            setStage(discovered === 5 ? 'Scripting' : 'Discovery');
          } else if (message.startsWith('Script stage')) {
            scripted += 1;
            setStage(scripted === 5 ? 'Complete' : 'Scripting');
          }
        }
      };
    } else {
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const hosts = Array.from({ length: 5 }, (_, i) => ({
        x: width / 2 + 100 * Math.cos((i / 5) * 2 * Math.PI),
        y: height / 2 + 100 * Math.sin((i / 5) * 2 * Math.PI),
        discovered: false,
        scripted: false,
      }));
      let step = 0;
      const prefersReducedMotion = window
        .matchMedia('(prefers-reduced-motion: reduce)')
        .matches;
      let discovered = 0;
      let scripted = 0;

      const draw = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, width, height);

        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.arc(width / 2, height / 2, 5, 0, Math.PI * 2);
        ctx.fill();

        hosts.forEach((host) => {
          if (host.discovered) {
            ctx.beginPath();
            ctx.strokeStyle = '#4ade80';
            ctx.lineWidth = 2;
            ctx.moveTo(width / 2, height / 2);
            ctx.lineTo(host.x, host.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.fillStyle = host.scripted ? '#4ade80' : '#60a5fa';
            ctx.arc(host.x, host.y, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      };

      const tick = () => {
        if (!prefersReducedMotion) {
          if (step < hosts.length) {
            hosts[step].discovered = true;
            discovered += 1;
            setStage(discovered === hosts.length ? 'Scripting' : 'Discovery');
            setAriaMessage(`Host ${step + 1} discovered`);
          } else if (step < hosts.length * 2) {
            const idx = step - hosts.length;
            hosts[idx].scripted = true;
            scripted += 1;
            setStage(scripted === hosts.length ? 'Complete' : 'Scripting');
            setAriaMessage(`Script stage completed for host ${idx + 1}`);
          } else {
            draw();
            return;
          }
          step += 1;
        } else {
          hosts.forEach((h) => {
            h.discovered = true;
            h.scripted = true;
          });
          setStage('Complete');
        }
        draw();
        animationFrame = requestAnimationFrame(tick);
      };

      draw();
      animationFrame = requestAnimationFrame(tick);
    }

    return () => {
      if (worker) worker.terminate();
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [trigger]);

  return (
    <div className="w-full mb-4">
      <div
        className={`text-center text-sm mb-2 transition-opacity ${
          prefersReduced ? '' : 'duration-500'
        } ${stage ? 'opacity-100' : 'opacity-0'}`}
      >
        Stage: {stage}
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={200}
        className="w-full border border-gray-500"
        role="img"
        aria-label="Animated network discovery map"
      />
      <div aria-live="polite" className="sr-only">
        {ariaMessage}
      </div>
    </div>
  );
};

export default DiscoveryMap;
