import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';

export default function WindowSwitcher({
  desktops = [],
  activeDesktopId,
  onSelect,
  onClose,
  onReorder,
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const inputRef = useRef(null);

  const orderedDesktops = useMemo(
    () => desktops.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [desktops],
  );

  const filtered = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();
    if (!normalisedQuery) {
      return orderedDesktops;
    }
    return orderedDesktops.filter((desktop) =>
      desktop.name.toLowerCase().includes(normalisedQuery),
    );
  }, [orderedDesktops, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const index = filtered.findIndex((desktop) => desktop.id === activeDesktopId);
    if (index >= 0) {
      setSelected(index);
    } else if (filtered.length && selected >= filtered.length) {
      setSelected(0);
    }
  }, [filtered, activeDesktopId, selected]);

  useEffect(() => {
    const handleKeyUp = (event) => {
      if (event.key === 'Alt') {
        const desktop = filtered[selected];
        if (desktop && typeof onSelect === 'function') {
          onSelect(desktop.id);
        } else if (typeof onClose === 'function') {
          onClose();
        }
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [filtered, selected, onSelect, onClose]);

  useEffect(() => {
    const handleCycle = (event) => {
      if (!filtered.length) return;
      const direction = typeof event.detail === 'number' ? event.detail : 1;
      setSelected((prev) => {
        const length = filtered.length;
        if (!length) return prev;
        return (prev + direction + length) % length;
      });
    };
    window.addEventListener('desktop-switcher-cycle', handleCycle);
    return () => window.removeEventListener('desktop-switcher-cycle', handleCycle);
  }, [filtered]);

  const handleKeyDown = (event) => {
    if (!filtered.length) {
      if (event.key === 'Escape' && typeof onClose === 'function') {
        event.preventDefault();
        onClose();
      }
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const direction = event.shiftKey ? -1 : 1;
      setSelected((prev) => (prev + direction + filtered.length) % filtered.length);
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected((prev) => (prev + 1) % filtered.length);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const desktop = filtered[selected];
      if (desktop && typeof onSelect === 'function') {
        onSelect(desktop.id);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (typeof onClose === 'function') {
        onClose();
      }
    }
  };

  const handleChange = (event) => {
    setQuery(event.target.value);
    setSelected(0);
  };

  const canDrag = !query && typeof onReorder === 'function';

  const handleDragStart = (desktopId) => (event) => {
    if (!canDrag) return;
    setDraggedId(desktopId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-virtual-desktop-id', desktopId);
  };

  const handleDragOver = (desktopId) => (event) => {
    if (!canDrag) return;
    event.preventDefault();
    if (draggedId && draggedId !== desktopId) {
      setDragOverId(desktopId);
    }
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (desktopId) => () => {
    if (dragOverId === desktopId) {
      setDragOverId(null);
    }
  };

  const handleDrop = (desktopId) => (event) => {
    if (!canDrag) return;
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('application/x-virtual-desktop-id') || draggedId;
    setDragOverId(null);
    setDraggedId(null);
    if (sourceId && sourceId !== desktopId) {
      onReorder(sourceId, desktopId);
    }
  };

  const handleDragEnd = () => {
    setDragOverId(null);
    setDraggedId(null);
  };

  const renderDesktop = (desktop, index) => {
    const isSelected = index === selected;
    const isActive = desktop.id === activeDesktopId;
    const isDropTarget = dragOverId === desktop.id;
    return (
      <button
        key={desktop.id}
        type="button"
        draggable={canDrag}
        aria-grabbed={draggedId === desktop.id}
        onDragStart={handleDragStart(desktop.id)}
        onDragOver={handleDragOver(desktop.id)}
        onDragEnter={handleDragOver(desktop.id)}
        onDragLeave={handleDragLeave(desktop.id)}
        onDrop={handleDrop(desktop.id)}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => setSelected(index)}
        onClick={() => {
          if (typeof onSelect === 'function') {
            onSelect(desktop.id);
          }
        }}
        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors border ${
          isSelected
            ? 'bg-ub-orange text-black border-ub-orange'
            : 'bg-black bg-opacity-20 text-white border-transparent hover:bg-white hover:bg-opacity-10'
        } ${isDropTarget ? 'ring-2 ring-ub-orange' : ''}`}
      >
        <div className="flex items-center gap-3">
          <Image
            src={desktop.icon}
            alt=""
            width={32}
            height={32}
            className="w-8 h-8"
            sizes="32px"
          />
          <div className="flex flex-col text-left">
            <span className="font-semibold truncate">{desktop.name}</span>
            <span className={`text-xs ${isSelected ? 'text-black/70' : 'text-white/60'}`}>
              {isActive ? 'Active workspace' : `Desktop ${index + 1}`}
            </span>
          </div>
        </div>
        {canDrag && (
          <span className={`text-xs uppercase tracking-wide ${isSelected ? 'text-black/70' : 'text-white/40'}`}>
            Drag to reorder
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white" role="dialog" aria-modal="true">
      <div className="bg-ub-grey p-4 rounded w-11/12 max-w-xl" onKeyDown={handleKeyDown}>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          className="w-full mb-4 px-3 py-2 rounded bg-black bg-opacity-20 focus:outline-none"
          placeholder="Search workspaces"
        />
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
          {filtered.map(renderDesktop)}
          {!filtered.length && (
            <div className="text-sm text-white/70 px-3 py-6 text-center">No matching workspaces</div>
          )}
        </div>
      </div>
    </div>
  );
}
