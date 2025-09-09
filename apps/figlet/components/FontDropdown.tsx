import React, { useState, useRef, useEffect } from 'react';

interface FontInfo {
  name: string;
  preview: string;
}

interface Props {
  fonts: FontInfo[];
  value: string;
  onChange: (font: string) => void;
}

const FontDropdown: React.FC<Props> = ({ fonts, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (open) {
      const handle = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handle);
      return () => document.removeEventListener('mousedown', handle);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  useEffect(() => {
    const idx = fonts.findIndex((f) => f.name === value);
    if (idx >= 0) setActive(idx);
  }, [value, fonts]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      setActive((a) => (a + 1) % fonts.length);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setActive((a) => (a - 1 + fonts.length) % fonts.length);
      e.preventDefault();
    } else if (e.key === 'Enter') {
        onChange(fonts[active]?.name || value);
      setOpen(false);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      setOpen(false);
      e.preventDefault();
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="px-1 bg-gray-700 text-white min-w-[6rem] text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKey}
      >
        {value || 'Select font'}
      </button>
      {open && (
        <ul
          role="listbox"
          ref={listRef}
          tabIndex={-1}
          className="absolute z-10 bg-gray-800 text-white max-h-60 overflow-auto w-full"
          onKeyDown={handleKey}
        >
          {fonts.map((f, i) => (
            <li
              key={f.name}
              role="option"
              aria-selected={value === f.name}
              className={`cursor-pointer px-2 ${i === active ? 'bg-blue-600' : ''}`}
              style={{ height: '24px', lineHeight: '24px', fontFamily: 'monospace' }}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(f.name);
                setOpen(false);
              }}
            >
              <span className="mr-2">{f.name}</span>
              <span className="text-gray-400">{f.preview.split('\n')[0]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FontDropdown;
