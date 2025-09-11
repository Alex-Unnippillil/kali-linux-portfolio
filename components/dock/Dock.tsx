import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import apps from '../../apps.config.js';
import { safeLocalStorage } from '../../utils/safeStorage';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
};

const STORAGE_KEY = 'dock-favorites';

/**
 * Dock component that displays favorited apps.
 * Icons can be reordered via drag-and-drop and the
 * order is persisted to localStorage.
 */
const Dock: React.FC = () => {
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = safeLocalStorage?.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      safeLocalStorage?.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // ignore write errors
    }
  }, [favorites]);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>,
    index: number,
  ) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(from) || from === index) return;
    setFavorites(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const favApps: AppMeta[] = favorites
    .map(id => apps.find(a => a.id === id))
    .filter(Boolean) as AppMeta[];

  return (
    <nav
      className="flex gap-2 p-2 bg-black bg-opacity-50"
      onDragOver={handleDragOver}
    >
      {favApps.map((app, index) => (
        <div
          key={app.id}
          draggable
          onDragStart={e => handleDragStart(e, index)}
          onDrop={e => handleDrop(e, index)}
          className="w-12 h-12 flex items-center justify-center cursor-move"
          title={app.title}
        >
          <Image
            src={app.icon.replace('./', '/')}
            alt={app.title}
            width={48}
            height={48}
            className="w-10 h-10"
          />
        </div>
      ))}
    </nav>
  );
};

export default Dock;

