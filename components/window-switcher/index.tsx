import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface WindowInfo {
  id: string;
  title: string;
  icon: string;
}

interface WindowSwitcherProps {
  windows: WindowInfo[];
  onSelect: (id: string) => void;
}

export default function WindowSwitcher({ windows, onSelect }: WindowSwitcherProps) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!visible) {
        if (e.altKey && e.key === 'Tab') {
          if (windows.length === 0) return;
          e.preventDefault();
          setVisible(true);
          setIndex(0);
        }
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          setIndex((i) => (i + 1) % windows.length);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setIndex((i) => (i - 1 + windows.length) % windows.length);
          break;
        case 'Enter':
          e.preventDefault();
          setVisible(false);
          const win = windows[index];
          if (win) {
            onSelect(win.id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setVisible(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [visible, windows, index, onSelect]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="flex space-x-4">
        {windows.map((win, i) => (
          <div
            key={win.id}
            className={`flex flex-col items-center px-4 py-2 rounded ${
              i === index ? 'bg-white bg-opacity-20' : ''
            }`}
          >
            <Image
              src={win.icon.replace('./', '/')}
              alt={win.title}
              width={48}
              height={48}
              className="w-12 h-12"
              sizes="48px"
            />
            <span className="mt-2 text-sm text-white whitespace-nowrap">{win.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

