import React, { useEffect, useRef, useState } from 'react';

const categories = {
  process: 'Processes',
  dll: 'DLLs',
  socket: 'Sockets',
};

const colors = {
  process: '#ef4444', // red-500
  dll: '#3b82f6', // blue-500
  socket: '#10b981', // green-500
};

// Use darker shades for chips to ensure sufficient contrast on white text
const chipColors = {
  process: 'bg-red-700',
  dll: 'bg-blue-700',
  socket: 'bg-green-700',
};

const MemoryHeatmap = ({ data }) => {
  const canvasRef = useRef(null);
  const [filters, setFilters] = useState({
    process: true,
    dll: true,
    socket: true,
  });
  const [announcement, setAnnouncement] = useState('');
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  useEffect(() => {
    const count = data.filter((d) => filters[d.type]).length;
    setAnnouncement(`Displaying ${count} memory segments`);
  }, [filters, data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    let frame;

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const filtered = data.filter((d) => filters[d.type]);
      filtered.forEach((cell) => {
        ctx.fillStyle = colors[cell.type];
        ctx.globalAlpha = cell.value;
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
      });
      ctx.globalAlpha = 1;
      if (!prefersReducedMotion.current) {
        frame = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(frame);
  }, [data, filters]);

  const toggle = (key) => setFilters((f) => ({ ...f, [key]: !f[key] }));

  return (
    <div className="space-y-2" aria-labelledby="memory-heatmap-heading">
      <h2 id="memory-heatmap-heading" className="text-lg font-semibold">
        Memory Heatmap
      </h2>
      <div className="flex flex-wrap gap-2">
        {Object.keys(categories).map((key) => (
          <button
            key={key}
            onClick={() => toggle(key)}
            aria-pressed={filters[key]}
            className={`px-3 py-1 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              filters[key]
                ? `${chipColors[key]} text-white focus:ring-white`
                : 'bg-gray-200 text-gray-800 focus:ring-black'
            }`}
          >
            {categories[key]}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={150}
        role="img"
        aria-label="Heatmap of memory regions"
        className="border border-gray-500 w-full h-40"
      />
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
};

export default MemoryHeatmap;
