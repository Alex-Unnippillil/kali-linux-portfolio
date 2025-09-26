import React, { useEffect, useRef, useState } from 'react';

const categories = {
  process: 'Processes',
  dll: 'DLLs',
  socket: 'Sockets',
};

// Use darker shades for chips to ensure sufficient contrast on white text
const chipColors = {
  process: 'bg-red-700',
  dll: 'bg-blue-700',
  socket: 'bg-green-700',
};

const MemoryHeatmap = ({ data }) => {
  const safeData = React.useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const canvasRef = useRef(null);
  const [filters, setFilters] = useState({
    process: true,
    dll: true,
    socket: true,
  });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [announcement, setAnnouncement] = useState('');
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  useEffect(() => {
    const count = safeData.filter((d) => filters[d.type]).length;
    setAnnouncement(`Displaying ${count} memory segments`);
  }, [filters, safeData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    let frame;

    const draw = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const filtered = safeData.filter((d) => filters[d.type]);
      filtered.forEach((cell) => {
        const x = cell.x - offset.x;
        const y = cell.y - offset.y;
        if (x + cell.width < 0 || y + cell.height < 0 || x > canvas.width || y > canvas.height) {
          return;
        }
        const gap = 6;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = cell.value;
        ctx.fillRect(x + gap / 2, y + gap / 2, cell.width - gap, cell.height - gap);
      });
      ctx.globalAlpha = 1;
      if (!prefersReducedMotion.current) {
        frame = requestAnimationFrame(draw);
      }
    };

    draw();
    return () => cancelAnimationFrame(frame);
  }, [safeData, filters, offset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const handleKeyDown = (e) => {
      let dx = 0;
      let dy = 0;
      switch (e.key) {
        case 'ArrowLeft':
          dx = -10;
          break;
        case 'ArrowRight':
          dx = 10;
          break;
        case 'ArrowUp':
          dy = -10;
          break;
        case 'ArrowDown':
          dy = 10;
          break;
        default:
          break;
      }
      if (dx !== 0 || dy !== 0) {
        setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
        e.preventDefault();
      }
    };

    canvas?.addEventListener('keydown', handleKeyDown);
    return () => canvas?.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        tabIndex={0}
        role="img"
        aria-label="Heatmap of memory regions. Use arrow keys to pan."
        className="border border-gray-500 w-full h-40 focus:outline-none"
      />
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
};

export default MemoryHeatmap;
