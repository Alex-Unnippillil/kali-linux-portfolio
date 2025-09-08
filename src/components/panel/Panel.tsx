import { isBrowser } from '@/utils/env';
import React, { useEffect, useState, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrag, useDrop } from 'react-dnd';
import layoutData from './layout.json';
import { usePanelPreferences } from './PanelPreferences';
import keybindingManager from '../../wm/keybindingManager';
import PowerMenu from './PowerMenu';

interface PluginItem {
  id: string;
  title: string;
}

interface DraggableProps {
  plugin: PluginItem;
  index: number;
  move: (from: number, to: number) => void;
  innerRef?: (el: HTMLDivElement | null) => void;
  focused: boolean;
  onFocus: () => void;
}

const type = 'PLUGIN_ITEM';

function DraggablePlugin({ plugin, index, move, innerRef, focused, onFocus }: DraggableProps) {
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

  return (
    <div
      ref={(el) => {
        ref.current = el;
        innerRef?.(el);
      }}
      tabIndex={focused ? 0 : -1}
      onFocus={onFocus}
      className={`flex items-center p-2 border mb-1 bg-black/20 text-white focus:outline focus:outline-2 focus:outline-white ${
        editMode && !locked ? 'cursor-move' : ''
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      {editMode && !locked && <span className="mr-2">⋮⋮</span>}
      {plugin.title}
    </div>
  );
}

export default function Panel() {
  const [plugins, setPlugins] = useState<PluginItem[]>(() => {
    if (isBrowser()) {
      try {
        const stored = localStorage.getItem('panel-layout');
        if (stored) return JSON.parse(stored) as PluginItem[];
      } catch {
        /* ignore */
      }
    }
    return layoutData as PluginItem[];
  });

  useEffect(() => {
    try {
      localStorage.setItem('panel-layout', JSON.stringify(plugins));
    } catch {
      /* ignore */
    }
  }, [plugins]);

  const move = (from: number, to: number) => {
    setPlugins((prev) => {
      const updated = [...prev];
      const [item] = updated.splice(from, 1);
      updated.splice(to, 0, item);
      return updated;
    });
  };

  const panelRef = useRef<HTMLDivElement>(null);
  const pluginRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    const focusPanel = () => {
      if (plugins.length === 0) return;
      setFocusedIndex(0);
      pluginRefs.current[0]?.focus();
    };
    keybindingManager.register('Alt+Ctrl+Tab', focusPanel);
    return () => {
      keybindingManager.unregister('Alt+Ctrl+Tab', focusPanel);
    };
  }, [plugins]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const next =
        focusedIndex === -1 ? 0 : (focusedIndex + 1) % plugins.length;
      setFocusedIndex(next);
      pluginRefs.current[next]?.focus();
    } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      const prev =
        focusedIndex === -1
          ? plugins.length - 1
          : (focusedIndex - 1 + plugins.length) % plugins.length;
      setFocusedIndex(prev);
      pluginRefs.current[prev]?.focus();
    } else if (e.key === 'Enter' && focusedIndex !== -1) {
      e.preventDefault();
      pluginRefs.current[focusedIndex]?.click();
    } else if (e.key === 'Escape' && focusedIndex !== -1) {
      e.preventDefault();
      pluginRefs.current[focusedIndex]?.blur();
      setFocusedIndex(-1);
      panelRef.current?.focus();
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        ref={panelRef}
        onKeyDown={handleKeyDown}
        role="toolbar"
        aria-label="Panel"
        tabIndex={0}
      >
        {plugins.map((p, i) =>
          p.id === 'power' ? (
            <PowerMenu
              key={p.id}
              index={i}
              move={move}
              innerRef={(el) => (pluginRefs.current[i] = el)}
              focused={focusedIndex === i}
              onFocus={() => setFocusedIndex(i)}
            />
          ) : (
            <DraggablePlugin
              key={p.id}
              plugin={p}
              index={i}
              move={move}
              innerRef={(el) => (pluginRefs.current[i] = el)}
              focused={focusedIndex === i}
              onFocus={() => setFocusedIndex(i)}
            />
          )
        )}
      </div>
    </DndProvider>
  );
}
