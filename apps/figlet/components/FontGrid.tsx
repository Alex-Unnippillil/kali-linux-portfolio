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
        className="min-w-[8rem] rounded border border-black/40 bg-gray-800 px-3 py-1 text-left text-xs uppercase tracking-wide text-white transition-colors hover:bg-gray-700"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {value || "Select font"}
      </button>
      {open && (
        <div
          className="absolute z-10 mt-1 max-h-72 w-72 overflow-auto rounded border border-black/60 bg-gray-900 p-2 shadow-lg"
          role="listbox"
        >
          <div className="grid grid-cols-2 gap-2">
            {fonts.map((f) => (
              <button
                key={f.name}
                type="button"
                role="option"
                aria-selected={value === f.name}
                onClick={() => {
                  onChange(f.name);
                  setOpen(false);
                }}
                className={`rounded px-3 py-2 text-left font-mono text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  value === f.name
                    ? "bg-blue-700/80 text-white shadow-inner ring-1 ring-blue-300"
                    : "bg-gray-800/70 text-gray-100 hover:bg-gray-700/80"
                }`}
                style={{ lineHeight: "1" }}
                title={f.name}
              >
                {f.preview.split("\n")[0]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FontGrid;
