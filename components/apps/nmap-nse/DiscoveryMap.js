import React, { useEffect, useRef } from 'react';

const drawMap = (canvas, hosts = []) => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, width, height);

  // center node
  ctx.beginPath();
  ctx.fillStyle = '#ffffff';
  ctx.arc(width / 2, height / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  hosts.forEach((host, i) => {
    const angle = (i / hosts.length) * 2 * Math.PI;
    const x = width / 2 + 100 * Math.cos(angle);
    const y = height / 2 + 100 * Math.sin(angle);

    ctx.beginPath();
    ctx.strokeStyle = '#4ade80';
    ctx.moveTo(width / 2, height / 2);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = '#60a5fa';
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    const label = host.label || host.alias || host.ip || host;
    ctx.fillText(label, x + 6, y + 3);
  });
};

const DiscoveryMap = ({ hosts = [] }) => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawMap(canvas, hosts);
  }, [hosts]);
  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={200}
      className="w-full border border-gray-500"
      role="img"
      aria-label="Network topology mini-map"
    />
  );
};

export default DiscoveryMap;
