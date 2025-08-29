'use client';

import React, { useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

interface HostEntry {
  id: number;
  host: string;
  note: string;
  tags: string[];
}

const HostNotebook: React.FC = () => {
  const [hosts, setHosts] = usePersistentState<HostEntry[]>(
    'metasploit-post-host-notes',
    [],
  );
  const [newHost, setNewHost] = useState('');

  const addHost = () => {
    const host = newHost.trim();
    if (!host) return;
    setHosts((prev) => [...prev, { id: Date.now(), host, note: '', tags: [] }]);
    setNewHost('');
  };

  const updateHost = (id: number, updates: Partial<Omit<HostEntry, 'id'>>) => {
    setHosts((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
  };

  const exportData = () => {
    try {
      const blob = new Blob([JSON.stringify(hosts, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'host-notes.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-8">
      <h3 className="font-semibold mb-2">Host Notebook</h3>
      <div className="flex mb-4">
        <input
          className="flex-1 p-2 mr-2 text-black"
          placeholder="Host identifier"
          value={newHost}
          onChange={(e) => setNewHost(e.target.value)}
        />
        <button onClick={addHost} className="px-3 py-1 bg-blue-600 rounded">
          Add Host
        </button>
        <button onClick={exportData} className="ml-2 px-3 py-1 bg-gray-700 rounded">
          Export
        </button>
      </div>
      <div className="space-y-4">
        {hosts.map((h) => (
          <div key={h.id} className="border border-gray-700 p-3 rounded">
            <h4 className="font-semibold mb-2">{h.host}</h4>
            <textarea
              className="w-full p-2 mb-2 text-black"
              placeholder="Notes"
              value={h.note}
              onChange={(e) => updateHost(h.id, { note: e.target.value })}
            />
            <input
              className="w-full p-2 text-black"
              placeholder="Tags (comma separated)"
              value={h.tags.join(', ')}
              onChange={(e) =>
                updateHost(h.id, {
                  tags: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              }
            />
            {h.tags.length > 0 && (
              <div className="mt-2 text-sm text-gray-400">
                {h.tags.map((tag) => (
                  <span key={tag} className="mr-1">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HostNotebook;

