import React from 'react';

export default function CallGraph({ func, callers = [], onSelect }) {
  const size = 200;
  const center = { x: size / 2, y: size / 2 };
  const radius = 70;
  const neighbors = Array.from(new Set([...(func?.calls || []), ...callers]));
  const positions = {};
  neighbors.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / neighbors.length;
    positions[n] = {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  });

  return (
    <svg
      role="img"
      aria-label="Call graph"
      viewBox={`0 0 ${size} ${size}`}
      className="h-full w-full rounded-lg bg-slate-950"
    >
      {(func?.calls || []).map((c) => (
        <line
          key={`out-${c}`}
          x1={center.x}
          y1={center.y}
          x2={positions[c].x}
          y2={positions[c].y}
          stroke="#38bdf8"
          strokeWidth={2}
        />
      ))}
      {callers.map((c) => (
        <line
          key={`in-${c}`}
          x1={positions[c].x}
          y1={positions[c].y}
          x2={center.x}
          y2={center.y}
          stroke="#f97316"
          strokeWidth={2}
        />
      ))}
      <g>
        <circle
          cx={center.x}
          cy={center.y}
          r={20}
          className="fill-orange-500/80 stroke-orange-200/80"
        />
        <text
          x={center.x}
          y={center.y + 4}
          textAnchor="middle"
          className="fill-slate-100 text-xs font-semibold"
        >
          {func?.name || 'func'}
        </text>
      </g>
      {neighbors.map((n) => (
        <g
          key={n}
          onClick={() => onSelect && onSelect(n)}
          onKeyDown={(event) => {
            if (onSelect && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault();
              onSelect(n);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={`Focus on ${n}`}
          className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          <circle
            cx={positions[n].x}
            cy={positions[n].y}
            r={15}
            className="fill-slate-800/90 stroke-slate-600"
          />
          <text
            x={positions[n].x}
            y={positions[n].y + 4}
            textAnchor="middle"
            className="fill-slate-100 text-xs"
          >
            {n}
          </text>
        </g>
      ))}
    </svg>
  );
}
