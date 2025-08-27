import React, { useEffect, useRef, useState } from 'react';

const DiscoveryMap = ({ trigger }) => {
  const canvasRef = useRef(null);
  const [ariaMessage, setAriaMessage] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // For consistency across browsers, render in the main thread.
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const hosts = Array.from({ length: 5 }, (_, i) => {
      const x = width / 2 + 100 * Math.cos((i / 5) * 2 * Math.PI);
      const y = height / 2 + 100 * Math.sin((i / 5) * 2 * Math.PI);
      const angle = Math.atan2(y - height / 2, x - width / 2);
      return { x, y, angle, discovered: false };
    });

    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = width;
    fogCanvas.height = height;
    const fogCtx = fogCanvas.getContext('2d');
    fogCtx.fillStyle = 'rgba(0,0,0,0.6)';
    fogCtx.fillRect(0, 0, width, height);

    let angle = 0;
    const sweep = Math.PI / 8;
    let animationFrame;
    const prefersReducedMotion = window
      .matchMedia('(prefers-reduced-motion: reduce)')
      .matches;

    const drawBase = () => {
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
          ctx.fillStyle = '#4ade80';
          ctx.arc(host.x, host.y, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.drawImage(fogCanvas, 0, 0);
    };

    const tick = () => {
      if (!prefersReducedMotion) {
        angle += 0.05;

        fogCtx.save();
        fogCtx.globalCompositeOperation = 'destination-out';
        fogCtx.translate(width / 2, height / 2);
        fogCtx.rotate(angle);
        fogCtx.beginPath();
        fogCtx.moveTo(0, 0);
        fogCtx.arc(0, 0, Math.max(width, height), -sweep / 2, sweep / 2);
        fogCtx.closePath();
        fogCtx.fill();
        fogCtx.restore();
        fogCtx.globalCompositeOperation = 'source-over';

        hosts.forEach((h, idx) => {
          if (!h.discovered) {
            const diff = (angle - h.angle + Math.PI * 2) % (Math.PI * 2);
            if (diff < sweep) {
              h.discovered = true;
              setAriaMessage(`Host ${idx + 1} discovered`);
            }
          }
        });

        drawBase();
        if (angle < Math.PI * 2) {
          animationFrame = requestAnimationFrame(tick);
        } else {
          setAriaMessage('Scan complete');
        }
      } else {
        hosts.forEach((h) => {
          h.discovered = true;
        });
        fogCtx.clearRect(0, 0, width, height);
        drawBase();
      }
    };

    drawBase();
    animationFrame = requestAnimationFrame(tick);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [trigger]);

  return (
    <div className="w-full mb-4">
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
