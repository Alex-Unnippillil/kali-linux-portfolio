import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';

interface AppEntry {
  id: string;
  title: string;
}

interface RunDialogProps {
  apps: AppEntry[];
  openApp: (id: string) => void;
  onClose: () => void;
}

const RunDialog: React.FC<RunDialogProps> = ({ apps, openApp, onClose }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = apps.filter(app =>
    app.id.toLowerCase().includes(query.toLowerCase()) ||
    app.title.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const launch = (id: string) => {
    if (id) {
      openApp(id);
      onClose();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected(s => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected(s => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const app = filtered[selected];
      launch(app ? app.id : query);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center mt-40 bg-black bg-opacity-40" onClick={onClose}>
      <div className="bg-ub-grey w-96 rounded shadow-lg p-4" onClick={e => e.stopPropagation()}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Run a command"
            aria-label="Run command"
            className="w-full p-2 mb-2 rounded bg-black bg-opacity-20 text-white focus:outline-none"
          />
        <ul className="max-h-60 overflow-y-auto">
          {filtered.map((app, idx) => (
            <li
              key={app.id}
              className={`p-2 cursor-pointer ${idx === selected ? 'bg-ub-orange text-black' : 'text-white'}`}
              onMouseEnter={() => setSelected(idx)}
              onMouseDown={() => launch(app.id)}
            >
              {app.id}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RunDialog;
