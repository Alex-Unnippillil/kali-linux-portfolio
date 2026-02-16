'use client';

import { useEffect, useRef, useState } from 'react';

const HOME_PAGE = '/';
const WHITELIST = [HOME_PAGE, '/about', '/contact', '/projects', '/apps'];

interface Tab {
  id: number;
  url: string;
}

export default function BrowserApp() {
  const [tabs, setTabs] = useState<Tab[]>([{ id: 1, url: HOME_PAGE }]);
  const [activeId, setActiveId] = useState(1);
  const nextId = useRef(2);

  const [address, setAddress] = useState(HOME_PAGE);
  const [error, setError] = useState('');

  useEffect(() => {
    const current = tabs.find((t) => t.id === activeId);
    setAddress(current?.url || '');
  }, [activeId, tabs]);

  const addTab = () => {
    const id = nextId.current++;
    const newTab = { id, url: HOME_PAGE };
    setTabs([...tabs, newTab]);
    setActiveId(id);
    setAddress(HOME_PAGE);
  };

  const closeTab = (id: number) => {
    const index = tabs.findIndex((t) => t.id === id);
    const remaining = tabs.filter((t) => t.id !== id);
    if (remaining.length === 0) {
      const newId = nextId.current++;
      const newTab = { id: newId, url: HOME_PAGE };
      setTabs([newTab]);
      setActiveId(newId);
      setAddress(HOME_PAGE);
      return;
    }
    setTabs(remaining);
    if (id === activeId) {
      const newActive = remaining[Math.max(0, index - 1)];
      setActiveId(newActive.id);
      setAddress(newActive.url);
    }
  };

  const navigate = (e: React.FormEvent) => {
    e.preventDefault();
    const url = address.trim();
    if (!WHITELIST.includes(url)) {
      setError('Page not allowed');
      return;
    }
    setError('');
    setTabs(tabs.map((t) => (t.id === activeId ? { ...t, url } : t)));
  };

  const current = tabs.find((t) => t.id === activeId);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center bg-gray-200 px-2 space-x-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`flex items-center px-2 py-1 rounded-t cursor-pointer ${
              tab.id === activeId ? 'bg-white' : 'bg-gray-300'
            }`}
            onClick={() => setActiveId(tab.id)}
          >
            <span className="mr-2 truncate max-w-[100px]">
              {tab.url === HOME_PAGE ? 'Home' : tab.url}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className="ml-1 text-sm text-gray-600 hover:text-black"
              aria-label="Close tab"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addTab}
          className="px-2 py-1 text-sm bg-gray-300 rounded-t"
          aria-label="New tab"
        >
          +
        </button>
      </div>
      <form
        onSubmit={navigate}
        className="flex items-center bg-gray-100 p-2 space-x-2"
      >
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="flex-1 border rounded px-2 py-1"
          aria-label="Address bar"
          placeholder="Enter internal page"
        />
        <button
          type="submit"
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          Go
        </button>
      </form>
      {error && <p className="text-red-600 text-xs px-2">{error}</p>}
      {current && (
        <iframe
          src={current.url}
          className="flex-1 w-full"
          title="browser-tab"
        />
      )}
    </div>
  );
}

