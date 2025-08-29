import React, { useState } from 'react';

interface Props {
  name: string;
  fields: Record<string, string>;
}

const LayerView: React.FC<Props> = ({ name, fields }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="text-xs">
      <button
        onClick={() => setOpen(!open)}
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
          {Object.entries(fields).map(([k, v]) => (
            <li key={k} className="whitespace-pre-wrap">
              {k}: {v}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LayerView;
