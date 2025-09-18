import React, { useId, useState } from 'react';

export interface LayerField {
  label: string;
  value: string;
  start: number;
  length: number;
  description?: string;
}

export interface FieldRange {
  start: number;
  length: number;
  label: string;
}

interface Props {
  name: string;
  fields: LayerField[];
  onFocusField?: (range: FieldRange | null) => void;
  instructionsId?: string;
}

const LayerView: React.FC<Props> = ({
  name,
  fields,
  onFocusField,
  instructionsId,
}) => {
  const [open, setOpen] = useState(true);
  const descriptionBaseId = useId();

  return (
    <div className="text-xs space-y-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center cursor-pointer select-none"
        type="button"
        aria-expanded={open}
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
          {fields.map((field, index) => {
            const fieldDescriptionId = `${descriptionBaseId}-${index}`;
            const describedBy = [instructionsId]
              .concat(field.description ? fieldDescriptionId : [])
              .filter(Boolean)
              .join(' ');
            return (
              <li key={field.label} className="whitespace-pre-wrap">
                {field.description && (
                  <span id={fieldDescriptionId} className="sr-only">
                    {field.description}
                  </span>
                )}
                <button
                  type="button"
                  className="w-full text-left rounded px-1 py-0.5 hover:bg-gray-800 focus:outline focus:outline-1 focus:outline-yellow-400 focus:bg-gray-800"
                  onFocus={() =>
                    onFocusField?.({
                      start: field.start,
                      length: field.length,
                      label: `${name} ${field.label}`,
                    })
                  }
                  onBlur={() => onFocusField?.(null)}
                  onMouseEnter={() =>
                    onFocusField?.({
                      start: field.start,
                      length: field.length,
                      label: `${name} ${field.label}`,
                    })
                  }
                  onMouseLeave={() => onFocusField?.(null)}
                  aria-describedby={describedBy || undefined}
                  title={field.description}
                >
                  <span className="font-semibold">{field.label}:</span> {field.value}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default LayerView;
