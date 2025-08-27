import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Parser } from 'expr-eval';

const GraphPad = forwardRef(({ height = 200 }, ref) => {
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(40); // pixels per unit
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const parserRef = useRef(null);

  useImperativeHandle(ref, () => ({
    plot: (expr) => {
      try {
        parserRef.current = new Parser().parse(expr);
        draw();
      } catch (e) {
        parserRef.current = null;
        draw();
      }
    },
  }));

  const drawAxes = (ctx, width, height) => {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2 + offset.y);
    ctx.lineTo(width, height / 2 + offset.y);
    ctx.moveTo(width / 2 + offset.x, 0);
    ctx.lineTo(width / 2 + offset.x, height);
    ctx.stroke();
  };

  const drawFunction = (ctx, width, height) => {
    if (!parserRef.current) return;
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let px = 0; px < width; px++) {
      const x = (px - width / 2 - offset.x) / scale;
      let y;
      try {
        y = parserRef.current.evaluate({ x });
      } catch {
        y = NaN;
      }
      const py = height / 2 - y * scale + offset.y;
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    drawAxes(ctx, width, height);
    drawFunction(ctx, width, height);
  };

  useEffect(() => {
    draw();
  }, [scale, offset]);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    setScale((s) => Math.min(Math.max(10, s * delta), 400));
  };

  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2 - offset.x) / scale;
    const y = (rect.height / 2 + offset.y - (e.clientY - rect.top)) / scale;
    setCursor({ x: x.toFixed(2), y: y.toFixed(2) });
    if (isDragging.current) {
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  return (
    <div className="mt-4 relative">
      <canvas
        ref={canvasRef}
        width={400}
        height={height}
        className="w-full border border-gray-700"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <div className="absolute top-0 left-0 text-xs bg-gray-800 text-white p-1">
        x: {cursor.x}, y: {cursor.y}
      </div>
    </div>
  );
});

export default GraphPad;
