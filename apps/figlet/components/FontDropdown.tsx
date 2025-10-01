import React, { useState, useRef, useEffect, useCallback } from 'react';

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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemsRef = useRef<(HTMLLIElement | null)[]>([]);
  const wasOpen = useRef(false);

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
    const el = itemsRef.current[active] ?? null;
    if (el) {
      if (typeof document !== 'undefined' && document.activeElement !== el) {
        el.focus();
      }
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [open, active]);

  useEffect(() => {
    const idx = fonts.findIndex((f) => f.name === value);
    if (idx >= 0) {
      setActive(idx);
    } else if (fonts.length > 0) {
      setActive((prev) => Math.min(prev, fonts.length - 1));
    }
  }, [value, fonts]);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (wasOpen.current) {
      triggerRef.current?.focus();
    }
  }, [open]);

  const moveActive = useCallback(
    (delta: number) => {
      if (!fonts.length) return;
      setActive((a) => {
        const next = (a + delta + fonts.length) % fonts.length;
        return next;
      });
    },
    [fonts.length],
  );

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
      if (fonts.length) {
        moveActive(1);
        e.preventDefault();
      }
    } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
      if (fonts.length) {
        moveActive(-1);
        e.preventDefault();
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      const font = fonts[active];
      if (font) {
        onChange(font.name);
        setOpen(false);
        e.preventDefault();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      e.preventDefault();
    }
  };

  itemsRef.current.length = fonts.length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="px-1 bg-gray-700 text-white min-w-[6rem] text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKey}
        ref={triggerRef}
      >
        {value || 'Select font'}
      </button>
      {open && (
        <ul
          role="listbox"
          tabIndex={-1}
          className="absolute z-10 bg-gray-800 text-white max-h-60 overflow-auto w-full"
          onKeyDown={handleKey}
          aria-activedescendant={fonts.length ? `font-option-${active}` : undefined}
        >
          {fonts.map((f, i) => (
            <li
              key={f.name}
              role="option"
              id={`font-option-${i}`}
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              ref={(el) => {
                itemsRef.current[i] = el;
              }}
              className={`cursor-pointer px-2 ${
                i === active ? 'bg-blue-600' : value === f.name ? 'bg-gray-700' : ''
              }`}
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
