'use client';

import React from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';
import useScreenReader from '../../hooks/useScreenReader';

const ShortcutFooter: React.FC = () => {
  const { shortcuts } = useKeymap();
  const isScreenReader = useScreenReader();

  if (isScreenReader) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 text-xs text-white bg-black/60"
      aria-hidden="true"
    >
      <ul className="flex flex-wrap justify-center gap-x-4 px-2 py-1">
        {shortcuts.map((s) => (
          <li key={s.description} className="flex items-center gap-1">
            <kbd className="font-mono">{s.keys}</kbd>
            <span>{s.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ShortcutFooter;
