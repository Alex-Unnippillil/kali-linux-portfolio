'use client';

import { TrashHistoryEntry } from '../state';

interface Props {
  history: TrashHistoryEntry[];
  onRestore: (index: number) => void;
  onRestoreAll: () => void;
}

const describeEntry = (entry: TrashHistoryEntry) => {
  if (entry.action === 'empty') {
    return `${entry.items.length} item${entry.items.length === 1 ? '' : 's'} emptied`;
  }
  if (entry.items.length === 1) return entry.items[0].title;
  return `${entry.items[0].title} (+${entry.items.length - 1} more)`;
};

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
      <ul className="max-h-32 overflow-auto space-y-1">
        {history.map((entry, idx) => (
          <li key={entry.id} className="flex items-center justify-between gap-2">
            <div className="flex flex-col overflow-hidden">
              <span
                className="truncate font-mono"
                title={entry.items.map(item => item.title).join(', ')}
              >
                {describeEntry(entry)}
              </span>
              <span className="text-[10px] uppercase tracking-wide opacity-70">
                {entry.action === 'empty' ? 'Trash emptied' : 'Item deleted'}
              </span>
            </div>
            <button
              onClick={() => {
                const name = entry.items.length === 1 ? entry.items[0].title : `${entry.items.length} items`;
                if (window.confirm(`Restore ${name}?`)) onRestore(idx);
              }}
              className="text-ub-orange hover:underline"
            >
              Undo
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

