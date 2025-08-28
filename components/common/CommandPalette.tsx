import { useState, useEffect, useRef } from 'react';
import { useCommands } from '../../hooks/useCommands';

function fuzzyMatch(query: string, text: string) {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

export default function CommandPalette() {
  const { commands } = useCommands();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? commands.filter((c) =>
        fuzzyMatch(query, c.name + ' ' + (c.keywords?.join(' ') || ''))
      )
    : commands;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[index];
      if (cmd) {
        cmd.action();
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white text-black rounded shadow max-w-md w-full">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Type a command..."
          className="w-full p-2 border-b outline-none"
        />
        <ul role="menu">
          {filtered.map((cmd, i) => (
            <li key={cmd.id}>
              <button
                className={`w-full text-left px-2 py-1 ${i === index ? 'bg-gray-200' : ''}`}
                onMouseDown={() => {
                  cmd.action();
                  setOpen(false);
                }}
                role="menuitem"
              >
                {cmd.name}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-2 py-1 text-sm text-gray-500">No results</li>
          )}
        </ul>
      </div>
    </div>
  );
}

