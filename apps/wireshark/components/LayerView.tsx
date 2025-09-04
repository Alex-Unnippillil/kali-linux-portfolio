import React, { useState } from 'react';

interface Field {
  label: string;
  value: string;
  start: number;
  end: number;
}

interface Props {
  name: string;
  start: number;
  end: number;
  fields: Field[];
  onHover: (range: [number, number] | null) => void;
}

const LayerView: React.FC<Props> = ({ name, start, end, fields, onHover }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="text-xs">
      <button
        onClick={() => setOpen(!open)}
        onMouseEnter={() => onHover([start, end])}
        onMouseLeave={() => onHover(null)}
        className="flex items-center cursor-pointer select-none"
        type="button"
      >
        <svg
          className={`w-4 h-4 mr-1 transition-transform ${open ? 'rotate-90' : ''}`}
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <path d="M5 3l6 5-6 5z" fill="currentColor" />
        </svg>
        {name}
      </button>
      {open && (
        <ul className="pl-5 mt-1 space-y-0.5">
          {fields.map((f) => (
            <li
              key={f.label}
              className="whitespace-pre-wrap"
              onMouseEnter={() => onHover([f.start, f.end])}
              onMouseLeave={() => onHover(null)}
            >
              {f.label}: {f.value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LayerView;
