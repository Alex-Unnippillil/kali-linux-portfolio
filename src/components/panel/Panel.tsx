import React, { useEffect, useState, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDrag, useDrop } from 'react-dnd';
import layoutData from './layout.json';
import { usePanelPreferences } from './PanelPreferences';

interface PluginItem {
  id: string;
  title: string;
}

interface DraggableProps {
  plugin: PluginItem;
  index: number;
  move: (from: number, to: number) => void;
}

const type = 'PLUGIN_ITEM';

function DraggablePlugin({ plugin, index, move }: DraggableProps) {
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
      ref={ref}
      className={`flex items-center p-2 border mb-1 bg-black/20 text-white ${
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
    if (typeof window !== 'undefined') {
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

  return (
    <DndProvider backend={HTML5Backend}>
      <div>
        {plugins.map((p, i) => (
          <DraggablePlugin key={p.id} plugin={p} index={i} move={move} />
        ))}
      </div>
    </DndProvider>
  );
}
