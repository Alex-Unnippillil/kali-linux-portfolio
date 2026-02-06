"use client";

import { useMemo, useRef, useState } from 'react';
import ContextMenu, { type MenuItem } from '../../components/common/ContextMenu';
import {
  nestedContextMenu,
  toMenuItems,
  type MenuDefinition,
} from '../../components/common/menuDefinitions';

const MenuDemo = () => {
  const targetRef = useRef<HTMLButtonElement>(null);
  const [selection, setSelection] = useState<string>('None');

  const items: MenuItem[] = useMemo(() => {
    const findLabel = (defs: MenuDefinition[], search: string): string | null => {
      for (const entry of defs) {
        if (entry.id === search) {
          return entry.label;
        }
        if (entry.children) {
          const child = findLabel(entry.children, search);
          if (child) return child;
        }
      }
      return null;
    };

    return toMenuItems(nestedContextMenu, id => {
      setSelection(findLabel(nestedContextMenu, id) ?? id);
    });
  }, []);

  return (
    <main className="min-h-screen bg-ub-dark text-white p-8">
      <div className="max-w-xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Nested menu demo</h1>
          <p className="mt-2 text-sm text-gray-300">
            Focus the button below and press <kbd className="mx-1 rounded bg-gray-700 px-1">Shift</kbd>
            +<kbd className="mx-1 rounded bg-gray-700 px-1">F10</kbd> to open the menu using keyboard only.
          </p>
        </header>
        <div className="space-y-4">
          <button
            ref={targetRef}
            type="button"
            data-testid="menu-target"
            className="px-4 py-2 bg-ub-gedit-light text-black font-semibold rounded focus:outline-none focus:ring-2 focus:ring-ub-orange"
          >
            Document actions
          </button>
          <p data-testid="selection" className="text-sm text-gray-200">
            Selected action: <span className="font-semibold">{selection}</span>
          </p>
        </div>
      </div>
      <ContextMenu targetRef={targetRef} items={items} />
    </main>
  );
};

export default MenuDemo;

