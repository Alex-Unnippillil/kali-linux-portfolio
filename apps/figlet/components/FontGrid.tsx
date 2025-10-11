import React, { useState, useRef, useEffect } from "react";

interface FontInfo {
  name: string;
  preview: string;
  mono: boolean;
}

interface Props {
  fonts: FontInfo[];
  value: string;
  onChange: (font: string) => void;
}

const FontGrid: React.FC<Props> = ({ fonts, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="px-1 bg-gray-700 text-white min-w-[6rem] text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {value || "Select font"}
      </button>
      {open && (
        <div
          className="absolute z-10 bg-gray-800 text-white max-h-60 overflow-auto p-2 shadow-lg border border-gray-700"
          role="listbox"
        >
          <div className="grid grid-cols-2 gap-2">
            {fonts.map((f) => (
              <button
                key={f.name}
                type="button"
                role="option"
                aria-selected={value === f.name}
                aria-label={`Use ${f.name} font`}
                onClick={() => {
                  onChange(f.name);
                  setOpen(false);
                }}
                className={`flex flex-col gap-1 text-left px-2 py-2 rounded transition-colors ${
                  value === f.name ? "bg-blue-600" : "hover:bg-gray-700"
                }`}
                data-font-name={f.name}
              >
                <span className="text-xs font-semibold tracking-wide text-white">
                  {f.name}
                </span>
                <span className="text-[10px] leading-tight text-gray-300 whitespace-pre font-mono">
                  {f.preview.split("\n")[0] || f.name}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wide ${
                    f.mono ? "text-green-400" : "text-gray-500"
                  }`}
                >
                  {f.mono ? "Monospace" : "Proportional"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FontGrid;
