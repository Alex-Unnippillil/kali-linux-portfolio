import React, { useEffect, useState } from 'react';

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        const win = windows[selected];
        if (win && typeof onSelect === 'function') {
          onSelect(win.id);
        } else if (typeof onClose === 'function') {
          onClose();
        }
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [windows, selected, onSelect, onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab' || e.key === 'ArrowRight') {
        e.preventDefault();
        const len = windows.length;
        if (!len) return;
        const dir = e.shiftKey && e.key === 'Tab' ? -1 : 1;
        setSelected((selected + dir + len) % len);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const len = windows.length;
        if (!len) return;
        setSelected((selected - 1 + len) % len);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const win = windows[selected];
        if (win && typeof onSelect === 'function') onSelect(win.id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (typeof onClose === 'function') onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [windows, selected, onSelect, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div className="flex space-x-4">
        {windows.map((w, i) => (
          <div
            key={w.id}
            className={`flex flex-col items-center p-2 rounded ${
              i === selected ? 'bg-ub-orange text-black' : 'bg-ub-grey'
            }`}
          >
            {w.image || w.icon ? (
              <img
                src={w.image || w.icon}
                alt={w.title}
                className="h-24 w-32 object-cover"
              />
            ) : null}
            <span className="mt-2 text-sm text-center w-32 truncate">{w.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

