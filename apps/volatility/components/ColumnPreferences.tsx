'use client';

import React from 'react';
import pslistJson from '../../../public/demo-data/volatility/pslist.json';
import usePersistentState from '../../../components/usePersistentState.js';

interface Column { key: string; label: string; }
interface Row { [key: string]: any; }

const ColumnPreferences: React.FC = () => {
  const columns = (pslistJson as { columns: Column[] }).columns || [];
  const rows = (pslistJson as { rows: Row[] }).rows || [];

  const [prefs, setPrefs] = usePersistentState(
    'volatility-column-prefs',
    { hidden: [], pinned: [] }
  ) as [
    { hidden: string[]; pinned: string[] },
    React.Dispatch<React.SetStateAction<{ hidden: string[]; pinned: string[] }>>
  ];

  const toggleColumn = (key: string) => {
    setPrefs((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(key)
        ? prev.hidden.filter((k) => k !== key)
        : [...prev.hidden, key],
    }));
  };

  const togglePin = (key: string) => {
    setPrefs((prev) => ({
      ...prev,
      pinned: prev.pinned.includes(key)
        ? prev.pinned.filter((k) => k !== key)
        : [...prev.pinned, key],
    }));
  };

  const visibleColumns = columns.filter((c) => !prefs.hidden.includes(c.key));
  const pinnedColumns = visibleColumns.filter((c) => prefs.pinned.includes(c.key));
  const unpinnedColumns = visibleColumns.filter((c) => !prefs.pinned.includes(c.key));
  const orderedColumns = [...pinnedColumns, ...unpinnedColumns];

  return (
    <div className="p-4 bg-gray-900 text-white rounded-md space-y-3">
      <h2 className="text-sm font-semibold">Process List Column Controls</h2>
      <div className="flex flex-wrap gap-4 text-xs">
        {columns.map((col) => {
          const isHidden = prefs.hidden.includes(col.key);
          const isPinned = prefs.pinned.includes(col.key);
          return (
            <div key={col.key} className="flex items-center space-x-1">
              <input
                type="checkbox"
                className="accent-blue-500"
                checked={!isHidden}
                onChange={() => toggleColumn(col.key)}
              />
              <span>{col.label}</span>
              {!isHidden && (
                <button
                  onClick={() => togglePin(col.key)}
                  className={`px-1 rounded ${isPinned ? 'bg-yellow-600' : 'bg-gray-700'}`}
                >
                  {isPinned ? 'Unpin' : 'Pin'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <table className="w-full text-xs table-auto">
        <thead>
          <tr>
            {orderedColumns.map((col) => (
              <th
                key={col.key}
                className={`px-2 py-1 text-left bg-gray-700 ${
                  prefs.pinned.includes(col.key) ? 'bg-gray-800' : ''
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-gray-800">
              {orderedColumns.map((col) => (
                <td key={col.key} className="px-2 py-1 whitespace-nowrap">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ColumnPreferences;

