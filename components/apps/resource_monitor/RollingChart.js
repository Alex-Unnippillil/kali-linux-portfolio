import React, { useEffect, useRef } from 'react';

const RollingChart = ({ data, color, label, testId }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = color;
    ctx.beginPath();
    const max = Math.max(...data, 1);
    data.forEach((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - (d / max) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [data, color]);

  const latest = data[data.length - 1];

  return (
    <div className="flex flex-col items-center flex-1">
      <canvas ref={canvasRef} width={200} height={60} />
      <span className="mt-1 text-white">
        {label}: <span data-testid={testId}>{latest !== undefined ? latest.toFixed(1) : '0'}</span>
      </span>
    </div>
  );
};

export default RollingChart;
