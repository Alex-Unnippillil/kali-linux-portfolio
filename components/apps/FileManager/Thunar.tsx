"use client";

import React, { useState } from 'react';
import ShareModal from '../../filemanager/ShareModal';
import { useShares } from '../../../hooks/useShares';

interface Entry {
  name: string;
  type: 'file' | 'folder';
}

const fileSystem: Record<string, Entry[]> = {
  '/': [
    { name: 'Desktop', type: 'folder' },
    { name: 'README.txt', type: 'file' },
  ],
  '/Desktop': [
    { name: 'todo.txt', type: 'file' },
  ],
  '/Trash': [
    { name: 'old.log', type: 'file' },
  ],
};

export default function Thunar() {
  const [path, setPath] = useState('/');
  const [showShare, setShowShare] = useState(false);
  const shares = useShares();

  const entries = fileSystem[path] || [];

  const goUp = () => {
    if (path === '/') return;
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    const newPath = '/' + parts.join('/');
    setPath(newPath || '/');
  };

  const openEntry = (entry: Entry) => {
    if (entry.type === 'folder') {
      const newPath = path === '/' ? `/${entry.name}` : `${path}/${entry.name}`;
      setPath(newPath);
    }
  };

  const breadcrumbs = (() => {
    const parts = path.split('/').filter(Boolean);
    const crumbs = [{ name: 'Home', path: '/' }];
    let current = '';
    parts.forEach((segment) => {
      current += `/${segment}`;
      crumbs.push({ name: segment, path: current });
    });
    return crumbs;
  })();

  return (
    <div className="flex h-full text-white">
      <aside className="w-48 bg-gray-800 p-2 space-y-1">
        {['/', '/Desktop', '/Trash'].map((p) => (
          <button
            key={p}
            onClick={() => setPath(p)}
            className={`block w-full text-left px-2 py-1 rounded hover:bg-gray-700 ${path === p ? 'bg-gray-700' : ''}`}
          >
            {p === '/' ? 'Home' : p.replace('/', '')}
          </button>
        ))}
      </aside>
      <div className="flex-1 flex flex-col bg-ub-cool-grey">
        <div className="bg-gray-900 p-2 space-x-2 flex">
          <button
            onClick={goUp}
            className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
            disabled={path === '/'}
          >
            Up
          </button>
          <button
            onClick={() => setShowShare(true)}
            className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600"
          >
            Share
          </button>
        </div>
        <nav className="bg-gray-900 p-2 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path}>
              {i > 0 && ' / '}
              <button
                className="hover:underline"
                onClick={() => setPath(crumb.path)}
              >
                {crumb.name}
              </button>
              {shares.includes(crumb.path) && (
                <span aria-label="shared" className="ml-1">🔗</span>
              )}
            </span>
          ))}
        </nav>
        <main className="flex-1 overflow-auto p-2">
          {entries.length > 0 ? (
            <ul className="space-y-1">
              {entries.map((entry) => (
                <li key={entry.name}>
                  <button
                    onClick={() => openEntry(entry)}
                    className="hover:underline text-left"
                  >
                    {entry.name}
                  </button>
                  {entry.type === 'folder' &&
                    shares.includes(
                      path === '/' ? `/${entry.name}` : `${path}/${entry.name}`
                    ) && <span aria-label="shared" className="ml-1">🔗</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">Empty</p>
          )}
        </main>
      </div>
      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        path={path}
      />
    </div>
  );
}

export const displayThunar = () => <Thunar />;
