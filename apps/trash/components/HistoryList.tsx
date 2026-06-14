'use client';

import { TrashItem } from '../state';

interface Props {
  history: TrashItem[];
  onRestore: (index: number) => Promise<void> | void;
  onRestoreAll: () => Promise<void> | void;
}

export default function HistoryList({ history, onRestore, onRestoreAll }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="border-t border-white/10 px-3 py-4 text-xs space-y-3 bg-black/10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold uppercase tracking-wide text-[0.7rem] text-white/80">
          Recently Deleted
        </span>
        <button
          onClick={async () => {
            if (window.confirm('Restore all windows?')) {
              await onRestoreAll();
            }
          }}
          className="px-3 py-1.5 rounded-md border border-white/10 bg-white/10 text-[0.7rem] font-semibold uppercase tracking-wide hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
        >
          Restore All
        </button>
      </div>
      <ul className="max-h-40 overflow-auto space-y-2">
        {history.map((item, idx) => (
          <li
            key={item.closedAt}
            className="flex items-center justify-between gap-3 rounded-md bg-black/20 px-3 py-2 text-[0.7rem] transition-colors hover:bg-black/30"
          >
            <span className="truncate font-mono" title={item.title}>
              {item.title}
            </span>
            <button
              onClick={async () => {
                if (window.confirm(`Restore ${item.title}?`)) {
                  await onRestore(idx);
                }
              }}
              className="px-2 py-1 rounded-md border border-ub-orange/40 text-ub-orange hover:bg-ub-orange/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
            >
              Restore
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

