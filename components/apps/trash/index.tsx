import React, { useEffect, useState } from 'react';
import * as trash from './api';

const TrashApp: React.FC = () => {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState(trash.list());

  useEffect(() => {
    const interval = setInterval(() => setItems(trash.list()), 500);
    return () => clearInterval(interval);
  }, []);

  const filtered = query ? trash.search(query) : items;

  const handleRestore = (id: string) => {
    trash.restore(id);
    setItems(trash.list());
  };

  const handleEmpty = () => {
    if (!window.confirm('Empty trash?')) return;
    trash.empty(true);
    setItems(trash.list());
  };

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none relative p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <input
            className="text-black px-1"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span data-testid="size" className="text-sm">
            {trash.size()} items
          </span>
        </div>
        <button onClick={handleEmpty} className="px-2 py-1 bg-red-600 rounded">
          Empty
        </button>
      </div>
      <ul className="flex-1 overflow-auto">
        {filtered.map((item) => (
          <li key={item.id} className="mb-1 flex justify-between items-center">
            <span>
              {(item.payload?.name || item.id) + ' (' + item.type + ')'}
            </span>
            <button
              onClick={() => handleRestore(item.id)}
              className="px-2 py-1 bg-green-600 rounded"
            >
              Restore
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-center text-gray-400">Trash is Empty</li>
        )}
      </ul>
    </div>
  );
};

export default TrashApp;
export const displayTrash = () => <TrashApp />;
