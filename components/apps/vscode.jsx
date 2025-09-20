'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import apps from '../../apps.config';

// Load the actual VSCode app lazily so no editor dependencies are required
const VsCode = dynamic(() => import('../../apps/vscode'), { ssr: false });

// Simple fuzzy match: returns true if query characters appear in order
function fuzzyMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  let qi = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) qi++;
    ti++;
  }
  return qi === q.length;
}

// Static files that can be opened directly in a new tab
const files = ['README.md', 'CHANGELOG.md', 'package.json'];

const workspaceFolders = [
  { label: 'Workspace', path: 'workspace' },
  { label: 'Workspace / Data', path: 'workspace/data' },
  { label: 'VSCode Example', path: 'workspace/data/vscode-example' },
];

export default function VsCodeWrapper({ openApp }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState(
    workspaceFolders[0]?.path ?? ''
  );

  const items = useMemo(() => {
    const list = [
      ...apps.map((a) => ({ type: 'app', id: a.id, title: a.title })),
      ...files.map((f) => ({ type: 'file', id: f, title: f })),
    ];
    if (!query) return list;
    return list.filter((item) => fuzzyMatch(item.title, query));
  }, [query]);

  const fileExplorerApp = apps.find((app) => app.id === 'files');
  const fileExplorerEnabled =
    typeof openApp === 'function' && fileExplorerApp && !fileExplorerApp.disabled;

  const handleOpenInFiles = useCallback(() => {
    if (!fileExplorerEnabled || !selectedFolder) return;
    openApp('files', {
      path: selectedFolder,
      source: 'vscode',
      requestedAt: Date.now(),
    });
  }, [fileExplorerEnabled, openApp, selectedFolder]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setVisible((v) => !v);
      } else if (e.key === 'Escape') {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectItem = (item) => {
    setVisible(false);
    setQuery('');
    if (item.type === 'app' && openApp) {
      openApp(item.id);
    } else if (item.type === 'file') {
      window.open(item.id, '_blank');
    }
  };

  return (
    <div className="relative h-full w-full">
      <VsCode />
      {fileExplorerEnabled && (
        <div className="absolute top-3 right-3 flex items-center gap-2 rounded bg-black/60 px-3 py-2 text-white shadow-lg">
          <label
            htmlFor="vscode-folder-select"
            className="text-xs font-semibold uppercase tracking-wide"
          >
            Folder
          </label>
          <select
            id="vscode-folder-select"
            data-testid="vscode-folder-select"
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="rounded bg-white px-2 py-1 text-sm text-black"
          >
            {workspaceFolders.map((folder) => (
              <option key={folder.path} value={folder.path}>
                {folder.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            data-testid="open-in-files"
            onClick={handleOpenInFiles}
            disabled={!selectedFolder}
            className="rounded bg-ub-orange px-3 py-1 text-sm font-semibold text-black transition disabled:opacity-50"
          >
            Open in Files
          </button>
        </div>
      )}
      {visible && (
        <div className="absolute inset-0 flex items-start justify-center pt-24 bg-black/50">
          <div className="bg-gray-800 text-white w-11/12 max-w-md rounded shadow-lg p-2">
            <input
              autoFocus
              className="w-full p-2 mb-2 bg-gray-700 rounded outline-none"
              placeholder="Search apps or files"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="max-h-60 overflow-y-auto">
              {items.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    onClick={() => selectItem(item)}
                    className="w-full text-left px-2 py-1 rounded hover:bg-gray-700"
                  >
                    {item.title}
                  </button>
                </li>
              ))}
              {items.length === 0 && (
                <li className="px-2 py-1 text-sm text-gray-400">No results</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export const displayVsCode = (openApp) => <VsCodeWrapper openApp={openApp} />;

