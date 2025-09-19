'use client';

import type { TrashItem } from '../state';

interface Props {
  history: TrashItem[];
  onRestore: (index: number) => void;
  onRestoreAll: () => void;
}

export default function HistoryList({ history, onRestore, onRestoreAll }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="border-t border-black border-opacity-50 p-2 text-xs">
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold">Recently Deleted</span>
        <button
          onClick={() => {
            if (window.confirm('Restore all windows?')) onRestoreAll();
          }}
          className="border border-black bg-black bg-opacity-50 px-2 py-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange"
        >
          Restore All
        </button>
      </div>
      <ul className="max-h-32 overflow-auto">
        {history.map((item, idx) => (
          <li key={item.closedAt} className="flex justify-between items-center h-9">
            <span className="truncate mr-2 font-mono" title={item.title}>
              {item.title}
            </span>
            <button
              onClick={() => {
                if (window.confirm(`Restore ${item.title}?`)) onRestore(idx);
              }}
              className="text-ub-orange hover:underline"
            >
              Restore
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

