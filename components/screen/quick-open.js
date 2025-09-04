"use client";

import React, { useEffect, useState, useCallback } from 'react';
import useOPFS from '../../hooks/useOPFS';

const RECENT_KEY = 'recent-files';

export default function QuickOpen({ onClose }) {
  const { supported, root } = useOPFS();
  const [allFiles, setAllFiles] = useState([]);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRecent = useCallback(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      setRecent(stored);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const addRecent = useCallback(
    (file) => {
      const entry = { path: file.path };
      const updated = [entry, ...recent.filter((r) => r.path !== file.path)].slice(0, 10);
      setRecent(updated);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    },
    [recent],
  );

  useEffect(() => {
    if (!root) return;
    setLoading(true);
    const files = [];
    async function walk(dir, parts) {
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind === 'file') {
          files.push({ path: [...parts, name].join('/'), handle });
        } else if (handle.kind === 'directory') {
          await walk(handle, [...parts, name]);
        }
      }
    }
    walk(root, [])
      .then(() => setAllFiles(files))
      .finally(() => setLoading(false));
  }, [root]);

  useEffect(() => {
    const rf = [];
    for (const r of recent) {
      const f = allFiles.find((a) => a.path === r.path);
      if (f) rf.push(f);
    }
    setRecentFiles(rf);
  }, [recent, allFiles]);

  const openFile = useCallback(
    async (file) => {
      if (!file) return;
      addRecent(file);
      try {
        const text = await (await file.handle.getFile()).text();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } catch {
        // ignore errors
      }
      onClose();
    },
    [addRecent, onClose],
  );

  const list = query
    ? allFiles.filter((f) => f.path.toLowerCase().includes(query.toLowerCase()))
    : recentFiles;

  if (!supported) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
        <div className="bg-ub-cool-grey text-white p-4 rounded shadow">
          <p className="mb-4">OPFS not supported.</p>
          <button onClick={onClose} className="px-2 py-1 bg-black bg-opacity-50 rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-60 pt-20" onKeyDown={(e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && list[0]) openFile(list[0]);
    }}>
      <div className="bg-ub-cool-grey text-white w-2/3 max-w-xl rounded shadow-lg p-4">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to search files..."
          className="w-full px-2 py-1 text-black"
        />
        <div className="mt-2 max-h-80 overflow-auto">
          {list.map((f, i) => (
            <div
              key={i}
              className="px-2 py-1 cursor-pointer hover:bg-black hover:bg-opacity-20"
              onClick={() => openFile(f)}
            >
              {f.path}
            </div>
          ))}
          {loading && <div className="px-2 py-1">Loading...</div>}
          {!loading && list.length === 0 && <div className="px-2 py-1">No files</div>}
        </div>
        <button onClick={onClose} className="mt-2 px-2 py-1 bg-black bg-opacity-50 rounded">
          Close
        </button>
      </div>
    </div>
  );
}

