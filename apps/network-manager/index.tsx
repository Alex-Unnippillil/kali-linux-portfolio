'use client';

import React, { useState } from 'react';
import AddConnectionDialog, { NetworkConnection } from './components/AddConnectionDialog';
import usePersistentState from '../../hooks/usePersistentState';

const CONNECTIONS_KEY = 'network-manager-connections';

export default function NetworkManagerApp() {
  const [connections, setConnections] = usePersistentState<NetworkConnection[]>(CONNECTIONS_KEY, []);
  const [showDialog, setShowDialog] = useState(false);

  const handleSave = (conn: NetworkConnection) => {
    setConnections([...connections, conn]);
    setShowDialog(false);
  };

  return (
    <div className="h-full w-full bg-ub-cool-grey p-4 text-white">
      <h1 className="mb-4 text-lg font-bold">Connections</h1>
      <ul className="mb-4 space-y-2">
        {connections.length === 0 && (
          <li className="text-gray-600 dark:text-gray-400">No connections</li>
        )}
        {connections.map((c, i) => (
          <li key={i} className="rounded border border-gray-700 p-2">
            <div className="font-semibold">{c.name}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Type: {c.type}</div>
          </li>
        ))}
      </ul>
      <button
        onClick={() => setShowDialog(true)}
        className="rounded bg-ubt-blue px-3 py-1"
      >
        Add Connection
      </button>
      {showDialog && (
        <AddConnectionDialog
          onSave={handleSave}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}

