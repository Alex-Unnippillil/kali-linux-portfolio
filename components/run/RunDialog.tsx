import React, { useEffect, useRef, useState } from 'react';
import apps from '../../apps.config';

interface Props {
  openApp: (id: string) => void;
  onClose: () => void;
}

const RunDialog: React.FC<Props> = ({ openApp, onClose }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = apps.filter(app =>
    app.title.toLowerCase().includes(query.toLowerCase()) ||
    app.id.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const app = filtered[selected];
      if (app) {
        openApp(app.id);
        onClose();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const len = filtered.length;
      if (!len) return;
      setSelected((selected + 1) % len);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const len = filtered.length;
      if (!len) return;
      setSelected((selected - 1 + len) % len);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelected(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white"
      onClick={onClose}
    >
      <div
        className="bg-ub-grey p-4 rounded w-3/4 md:w-1/3"
        onClick={e => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full mb-4 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
          placeholder="Run an application"
          aria-label="Run command"
        />
        <ul>
          {filtered.map((app, i) => (
            <li
              key={app.id}
              className={`px-2 py-1 rounded ${i === selected ? 'bg-ub-orange text-black' : ''}`}
            >
              {app.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RunDialog;
