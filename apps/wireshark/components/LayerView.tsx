import React, { useEffect, useRef, useState } from 'react';

interface Field {
  key: string;
  value: string;
  start: number;
  end: number;
}

interface Props {
  name: string;
  fields: Field[];
  onHoverRange?: (range: [number, number] | null) => void;
  onRegisterField?: (range: [number, number], el: HTMLLIElement) => void;
  selectedRange?: [number, number] | null;
}

const LayerView: React.FC<Props> = ({
  name,
  fields,
  onHoverRange,
  onRegisterField,
  selectedRange,
}) => {
  const [open, setOpen] = useState(true);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (!selectedRange) return;
    const idx = fields.findIndex(
      (f) => selectedRange[0] >= f.start && selectedRange[1] <= f.end
    );
    if (idx !== -1 && refs.current[idx]) {
      refs.current[idx]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedRange, fields]);

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
          {fields.map((field, i) => (
            <li
              key={field.key}
              ref={(el) => {
                refs.current[i] = el;
                if (el) onRegisterField?.([field.start, field.end], el);
              }}
              onMouseEnter={() => onHoverRange?.([field.start, field.end])}
              onMouseLeave={() => onHoverRange?.(null)}
              className={`whitespace-pre-wrap ${
                selectedRange &&
                selectedRange[0] >= field.start &&
                selectedRange[1] <= field.end
                  ? 'bg-yellow-800'
                  : ''
              }`}
            >
              {field.key}: {field.value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LayerView;
