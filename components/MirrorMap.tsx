import React from 'react';

export interface Mirror {
  id: string;
  name: string;
  location: string;
  url: string;
  description: string;
  x: number;
  y: number;
}

interface Props {
  mirrors: Mirror[];
  selectedId?: string;
  onSelect: (mirror: Mirror) => void;
}

const MirrorMap: React.FC<Props> = ({ mirrors, selectedId, onSelect }) => {
  return (
    <svg viewBox="0 0 800 400" className="w-full max-w-3xl mx-auto bg-sky-100">
      <g fill="#d1d5db" stroke="#9ca3af" strokeWidth="2">
        <rect x="50" y="60" width="150" height="100" />
        <rect x="120" y="180" width="80" height="120" />
        <rect x="300" y="80" width="160" height="140" />
        <rect x="480" y="80" width="180" height="140" />
        <rect x="620" y="240" width="100" height="80" />
      </g>
      {mirrors.map((m) => (
        <circle
          key={m.id}
          cx={m.x}
          cy={m.y}
          r={8}
          className={`fill-red-500 cursor-pointer ${selectedId === m.id ? 'stroke-black stroke-2' : ''}`}
          onClick={() => onSelect(m)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSelect(m);
          }}
          role="button"
          tabIndex={0}
          aria-label={`Select ${m.name}`}
        />
      ))}
    </svg>
  );
};

export default MirrorMap;
