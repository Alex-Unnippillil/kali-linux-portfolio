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
          className="absolute z-10 bg-gray-800 text-white max-h-60 overflow-auto p-1"
          role="listbox"
        >
          <div className="grid grid-cols-2 gap-x-2 gap-y-[6px]">
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
                className={`text-left font-mono px-2 rounded ${
                  value === f.name ? "bg-blue-600" : "hover:bg-gray-700"
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
