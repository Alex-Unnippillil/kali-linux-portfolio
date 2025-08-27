import React, { useEffect, useRef, useState } from 'react';

export interface SearchItem {
  id: string;
  title: string;
  type: 'app' | 'help' | 'settings';
  url?: string;
}

interface Props {
  visible: boolean;
  items: SearchItem[];
  openApp: (id: string) => void;
  onClose: () => void;
}

const SearchOverlay: React.FC<Props> = ({ visible, items, openApp, onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [visible]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (visible) {
      window.addEventListener('keydown', handleKey);
    }
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onClose]);

  if (!visible) return null;

  const filtered = items.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  const selectItem = (item: SearchItem) => {
    if (item.type === 'app' || item.type === 'settings') {
      openApp(item.id);
    } else if (item.type === 'help' && item.url) {
      window.open(item.url, '_blank');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50">
      <div className="mt-24 bg-ub-grey rounded shadow-lg w-11/12 md:w-1/2 max-h-[70vh] overflow-y-auto">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search apps, settings, help..."
          className="w-full px-4 py-2 bg-black bg-opacity-20 text-white focus:outline-none"
        />
        <ul>
          {filtered.map((item) => (
            <li
              key={item.id}
              className="px-4 py-2 hover:bg-black hover:bg-opacity-40 cursor-pointer"
              onClick={() => selectItem(item)}
            >
              {item.title}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-2 text-ubt-grey">No results</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default SearchOverlay;
