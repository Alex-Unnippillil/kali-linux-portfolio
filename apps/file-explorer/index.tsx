'use client';
import { useEffect, useState } from 'react';

interface Item {
  name: string;
  type: 'file' | 'dir';
}

export default function FileExplorer() {
  const [path, setPath] = useState<string[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [content, setContent] = useState<string | null>(null);

  const currentPath = path.join('/');

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`/api/files?path=${encodeURIComponent(currentPath)}`);
      const data = await res.json();
      if ('content' in data) {
        setContent(data.content);
        setItems([]);
      } else {
        setItems(data.items || []);
        setContent(null);
      }
    };
    fetchData().catch(() => {
      setItems([]);
      setContent(null);
    });
  }, [currentPath]);

  const openItem = (item: Item) => {
    setPath((p) => [...p, item.name]);
  };

  const goUp = () => {
    setPath((p) => p.slice(0, -1));
  };

  return (
    <div className="p-2 text-sm text-white">
      <div className="flex items-center gap-2 mb-2">
        <button
          className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50"
          onClick={goUp}
          disabled={path.length === 0}
        >
          Up
        </button>
        <span>/{currentPath}</span>
      </div>
      {content !== null ? (
        <pre className="whitespace-pre-wrap text-xs bg-gray-900 p-2 rounded overflow-auto">
          {content}
        </pre>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.name}>
              <button
                className="w-full text-left px-2 py-1 hover:bg-gray-700 rounded"
                onClick={() => openItem(item)}
              >
                {item.type === 'dir' ? '📁' : '📄'} {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
