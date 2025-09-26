import React, { useEffect, useMemo, useRef, useState } from 'react';

type PlaceItem = {
  id: string;
  label: string;
  path: string;
  description?: string;
};

type PlaceGroup = {
  id: string;
  label: string;
  items: PlaceItem[];
};

const PLACE_GROUPS: PlaceGroup[] = [
  {
    id: 'personal',
    label: 'Personal',
    items: [
      { id: 'home', label: 'Home', path: '/home/kali', description: '~' },
      { id: 'desktop', label: 'Desktop', path: '/home/kali/Desktop', description: '~/Desktop' },
      { id: 'documents', label: 'Documents', path: '/home/kali/Documents', description: '~/Documents' },
      { id: 'downloads', label: 'Downloads', path: '/home/kali/Downloads', description: '~/Downloads' },
      { id: 'music', label: 'Music', path: '/home/kali/Music', description: '~/Music' },
      { id: 'pictures', label: 'Pictures', path: '/home/kali/Pictures', description: '~/Pictures' },
      { id: 'videos', label: 'Videos', path: '/home/kali/Videos', description: '~/Videos' },
    ],
  },
  {
    id: 'devices',
    label: 'Devices',
    items: [
      { id: 'filesystem', label: 'File System', path: '/', description: '/' },
      { id: 'removable', label: 'Removable Media', path: '/media', description: '/media' },
      { id: 'workspace', label: 'Workspace', path: '/mnt/workspace', description: '/mnt/workspace' },
    ],
  },
  {
    id: 'network',
    label: 'Network',
    items: [
      { id: 'browse-network', label: 'Browse Network', path: '/network/browse-network', description: 'network:///' },
      { id: 'connect-server', label: 'Connect to Server', path: '/network/servers', description: 'network:///servers' },
    ],
  },
];

const PlacesMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () =>
      PLACE_GROUPS.flatMap((group) =>
        group.items.map((item) => ({ ...item, groupId: group.id, groupLabel: group.label })),
      ),
    [],
  );

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
    const menu = menuRef.current;
    const id = window.requestAnimationFrame(() => menu?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const openPlace = (item: PlaceItem) => {
    const detail: Record<string, unknown> = {
      id: 'file-explorer',
      path: item.path,
      initialPath: item.path,
      label: item.label,
    };
    window.dispatchEvent(new CustomEvent('open-app', { detail }));
    setOpen(false);
  };

  const handleMenuKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((h) => (h + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((h) => (h - 1 + items.length) % items.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setHighlight(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setHighlight(items.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const item = items[highlight];
      if (item) openPlace(item);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        Places
      </button>
      {open && (
        <div
          ref={menuRef}
          tabIndex={-1}
          role="menu"
          onKeyDown={handleMenuKey}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setOpen(false);
            }
          }}
          className="absolute left-0 mt-1 z-50 w-64 bg-ub-grey text-white shadow-lg focus:outline-none"
        >
          <div className="px-3 py-2">
            {(() => {
              let cursor = -1;
              return PLACE_GROUPS.map((group) => (
                <div key={group.id} className="mb-2 last:mb-0">
                  <div className="text-xs uppercase tracking-wide text-ubt-grey mb-1">
                    {group.label}
                  </div>
                  <ul>
                    {group.items.map((item) => {
                      cursor += 1;
                      const flatIndex = cursor;
                      const active = highlight === flatIndex;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            role="menuitem"
                            className={`w-full text-left px-2 py-1 rounded transition-colors duration-100 ${
                              active ? 'bg-gray-700' : 'hover:bg-black hover:bg-opacity-30'
                            }`}
                            onMouseEnter={() => setHighlight(flatIndex)}
                            onClick={() => openPlace(item)}
                          >
                            <div className="font-medium">{item.label}</div>
                            {item.description && (
                              <div className="text-xs text-ubt-grey">{item.description}</div>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacesMenu;
