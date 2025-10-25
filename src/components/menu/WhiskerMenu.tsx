'use client';
import React, { useEffect, useState } from 'react';
import { promises as fs } from 'fs';
import path from 'path';

interface MenuItem {
  id: string;
  name: string;
  category: string;
}

interface Persistence {
  favorites: string[];
  recent: string[];
}

const CONFIG_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.config',
  'whisker',
  'favorites.json'
);

async function loadPersistence(): Promise<Persistence> {
  try {
    const data = await fs.readFile(CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return { favorites: [], recent: [] };
  }
}

async function savePersistence(data: Persistence) {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2));
}

const WhiskerMenu: React.FC<{ items: MenuItem[] }> = ({ items }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [context, setContext] =
    useState<{ x: number; y: number; item: MenuItem } | null>(null);

  useEffect(() => {
    loadPersistence().then((data) => {
      setFavorites(data.favorites || []);
      setRecent(data.recent || []);
    });
  }, []);

  useEffect(() => {
    savePersistence({ favorites, recent }).catch(() => {
      // ignore persistence errors
    });
  }, [favorites, recent]);

  const handleLaunch = (item: MenuItem) => {
    setRecent((prev) => {
      const updated = [item.id, ...prev.filter((id) => id !== item.id)];
      return updated.slice(0, 10);
    });
  };

  const toggleFavorite = (item: MenuItem) => {
    setFavorites((prev) =>
      prev.includes(item.id)
        ? prev.filter((id) => id !== item.id)
        : [...prev, item.id]
    );
  };

  const categories = Array.from(new Set(items.map((i) => i.category))).sort();
  const visibleItems = items
    .filter(
      (i) => category === 'All' || i.category.toLowerCase() === category.toLowerCase()
    )
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  const favoriteItems = favorites
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean) as MenuItem[];
  const recentItems = recent
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean) as MenuItem[];

  const handleContextMenu = (
    e: React.MouseEvent<HTMLDivElement>,
    item: MenuItem
  ) => {
    e.preventDefault();
    setContext({ x: e.clientX, y: e.clientY, item });
  };

  const addToPanel = (item: MenuItem) => {
    console.log('Add to panel', item.name);
    setContext(null);
  };

  const addToDesktop = (item: MenuItem) => {
    console.log('Add to desktop', item.name);
    setContext(null);
  };

  const editApplication = (item: MenuItem) => {
    console.log('Edit application', item.name);
    setContext(null);
  };

  const renderItem = (item: MenuItem) => (
    <div
      key={item.id}
      onClick={() => handleLaunch(item)}
      onContextMenu={(e) => handleContextMenu(e, item)}
      className="px-2 py-1 hover:bg-gray-200 cursor-pointer flex justify-between"
    >
      <span>{item.name}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(item);
        }}
        aria-label="Toggle favorite"
      >
        {favorites.includes(item.id) ? '★' : '☆'}
      </button>
    </div>
  );

  return (
    <div className="whisker-menu p-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search..."
        aria-label="Search"
        className="w-full mb-2 px-2 py-1"
      />
      <div className="mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          className={`px-2 py-1 border ${category === 'All' ? 'bg-gray-300' : ''}`}
          onClick={() => setCategory('All')}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`px-2 py-1 border ${
              category === cat ? 'bg-gray-300' : ''
            }`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      {favoriteItems.length > 0 && (
        <div className="mb-2">
          <h3 className="font-bold">Favorites</h3>
          {favoriteItems.map((item) => renderItem(item))}
        </div>
      )}
      {recentItems.length > 0 && (
        <div className="mb-2">
          <h3 className="font-bold">Recent</h3>
          {recentItems.map((item) => renderItem(item))}
        </div>
      )}
      <div>
        <h3 className="font-bold">Applications</h3>
        {visibleItems.map((item) => renderItem(item))}
      </div>
      {context && (
        <ul
          className="absolute bg-white border shadow rounded"
          style={{ top: context.y, left: context.x }}
        >
          <li>
            <button
              type="button"
              className="block w-full px-2 py-1 text-left hover:bg-gray-200"
              onClick={() => addToPanel(context.item)}
            >
              Add to panel
            </button>
          </li>
          <li>
            <button
              type="button"
              className="block w-full px-2 py-1 text-left hover:bg-gray-200"
              onClick={() => addToDesktop(context.item)}
            >
              Add to desktop
            </button>
          </li>
          <li>
            <button
              type="button"
              className="block w-full px-2 py-1 text-left hover:bg-gray-200"
              onClick={() => editApplication(context.item)}
            >
              Edit application
            </button>
          </li>
        </ul>
      )}
    </div>
  );
};

export default WhiskerMenu;
