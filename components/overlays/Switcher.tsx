import React, { useEffect, useState } from 'react';

interface WindowInfo {
  id: string;
  title: string;
  icon?: string;
}

interface SwitcherProps {
  windows: WindowInfo[];
  onSelect?: (id: string) => void;
  onClose?: () => void;
}

export default function Switcher({ windows, onSelect, onClose }: SwitcherProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [windows]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        const len = windows.length;
        if (!len) return;
        const dir = e.shiftKey ? -1 : 1;
        setIndex((i) => (i + dir + len) % len);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const len = windows.length;
        if (!len) return;
        setIndex((i) => (i + 1) % len);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const len = windows.length;
        if (!len) return;
        setIndex((i) => (i - 1 + len) % len);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['Alt', 'Meta', 'Control'].includes(e.key)) {
        const win = windows[index];
        if (win) {
          onSelect?.(win.id);
        } else {
          onClose?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [windows, index, onSelect, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div className="flex space-x-4">
        {windows.map((w, i) => (
          <div
            key={w.id}
            className={`flex flex-col items-center px-3 py-2 rounded ${
              i === index ? 'bg-ub-orange text-black' : ''
            }`}
          >
            {w.icon && (
              <img
                src={w.icon}
                alt=""
                className="h-12 w-12 mb-1 object-contain"
              />
            )}
            <span className="text-sm whitespace-nowrap">{w.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

