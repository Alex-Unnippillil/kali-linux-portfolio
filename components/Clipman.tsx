"use client";

import React, { useState } from 'react';
import { pastePlainText } from '../src/lib/clipboard';

interface MenuState {
  x: number;
  y: number;
  target: HTMLInputElement | HTMLTextAreaElement | null;
}

const Clipman: React.FC = () => {
  const [menu, setMenu] = useState<MenuState | null>(null);

  const openMenu = (
    e: React.MouseEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, target: e.currentTarget });
  };

  const paste = async () => {
    if (!menu?.target) return;
    const text = await pastePlainText();
    const el = menu.target;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    el.value = before + text + after;
    const pos = start + text.length;
    el.setSelectionRange(pos, pos);
    el.focus();
    setMenu(null);
  };

  const closeMenu = () => setMenu(null);

  return (
    <div className="p-4 space-y-2" onClick={closeMenu}>
      <input
        type="text"
        placeholder="Sample input"
        aria-label="sample input"
        onContextMenu={openMenu}
        className="border p-1 w-full"
      />
      <textarea
        placeholder="Another field"
        aria-label="another field"
        onContextMenu={openMenu}
        className="border p-1 w-full"
      />
      {menu && (
        <ul
          data-testid="context-menu"
          role="menu"
          aria-label="Clipboard actions"
          className="absolute bg-gray-800 text-white p-2 z-50"
          style={{ top: menu.y, left: menu.x }}
        >
          <li
            role="menuitem"
            tabIndex={-1}
            className="cursor-pointer px-2 py-1 hover:bg-gray-700"
            onClick={paste}
          >
            Paste Plain Text
          </li>
        </ul>
      )}
    </div>
  );
};

export default Clipman;
