import React, { useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { usePanelPreferences } from './PanelPreferences';

interface Props {
  index: number;
  move: (from: number, to: number) => void;
  innerRef?: (el: HTMLDivElement | null) => void;
  focused: boolean;
  onFocus: () => void;
}

const type = 'PLUGIN_ITEM';

export default function PowerMenu({ index, move, innerRef, focused, onFocus }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { editMode, locked } = usePanelPreferences();

  const [, drop] = useDrop<{ index: number }>({
    accept: type,
    hover(item) {
      if (!ref.current || item.index === index) return;
      move(item.index, index);
      item.index = index;
    },
  }, [index]);

  const [{ isDragging }, drag] = useDrag({
    type,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: editMode && !locked,
  }, [index, editMode, locked]);

  drag(drop(ref));

  const [open, setOpen] = useState(false);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (open) {
      itemRefs.current[0]?.focus();
    }
  }, [open]);

  const handleItemKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const items = itemRefs.current;
    const idx = items.findIndex((i) => i === e.currentTarget);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (idx + 1) % items.length;
      items[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (idx - 1 + items.length) % items.length;
      items[prev]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      ref.current?.focus();
    }
  };

  const restart = () => {
    window.dispatchEvent(new Event('power-restart'));
    window.location.reload();
  };

  const logOut = () => {
    try {
      window.localStorage.clear();
      window.sessionStorage?.clear();
    } catch {
      /* ignore */
    }
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div
      ref={(el) => {
        ref.current = el;
        innerRef?.(el);
      }}
      tabIndex={focused ? 0 : -1}
      onFocus={onFocus}
      onClick={() => setOpen((o) => !o)}
      className={`relative flex items-center p-2 border mb-1 bg-black/20 text-white focus:outline focus:outline-2 focus:outline-white ${
        editMode && !locked ? 'cursor-move' : ''
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      Power
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-32 bg-black text-white rounded shadow-lg flex flex-col"
        >
          <button
            role="menuitem"
            ref={(el) => (itemRefs.current[0] = el)}
            onKeyDown={handleItemKey}
            onClick={() => {
              setOpen(false);
              restart();
              ref.current?.focus();
            }}
            className="px-2 py-1 text-left hover:bg-gray-700"
          >
            Restart
          </button>
          <button
            role="menuitem"
            ref={(el) => (itemRefs.current[1] = el)}
            onKeyDown={handleItemKey}
            onClick={() => {
              setOpen(false);
              logOut();
              ref.current?.focus();
            }}
            className="px-2 py-1 text-left hover:bg-gray-700"
          >
            Log Out
          </button>
          <button
            role="menuitem"
            ref={(el) => (itemRefs.current[2] = el)}
            onKeyDown={handleItemKey}
            onClick={() => {
              setOpen(false);
              toggleTheme();
              ref.current?.focus();
            }}
            className="px-2 py-1 text-left hover:bg-gray-700"
          >
            Theme
          </button>
        </div>
      )}
    </div>
  );
}

