'use client';

import type { AppMetadata } from '../../../lib/appRegistry';
import { TrashItem } from '../state';

interface Props {
  history: TrashItem[];
  onRestoreRequest: (item: TrashItem, index: number) => void;
  onRestoreAllRequest: () => void;
  getMetadata: (id: string) => AppMetadata | undefined;
  formatRelativeTime: (closedAt: number) => string;
}

export default function HistoryList({
  history,
  onRestoreRequest,
  onRestoreAllRequest,
  getMetadata,
  formatRelativeTime,
}: Props) {
  if (history.length === 0) return null;

  return (
    <section
      aria-label="Recently deleted"
      className="border-t border-white/10 bg-black/20 px-4 py-5 text-xs text-white/80"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.2em] text-white/60">
            Recently Deleted
          </p>
          <p className="mt-1 text-[0.7rem] text-white/60">
            Items you delete appear here for quick undo.
          </p>
        </div>
        <button
          onClick={onRestoreAllRequest}
          className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-white transition-transform hover:-translate-y-0.5 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
        >
          Restore All
        </button>
      </div>
      <ul className="mt-4 max-h-48 space-y-2 overflow-auto pr-1" role="list">
        {history.map((item, idx) => {
          const meta = getMetadata(item.id);
          return (
            <li
              key={`${item.id}-${item.closedAt}`}
              className="flex items-start gap-3 rounded-lg border border-white/5 bg-black/30 px-3 py-2 transition-transform hover:-translate-y-0.5 hover:bg-black/40"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-ub-orange/40 to-ub-pink/40 text-[0.65rem] font-semibold text-white">
                ↺
              </div>
              <div className="flex-1 space-y-1">
                <p className="truncate font-medium text-white" title={item.title}>
                  {item.title}
                </p>
                {meta?.path && (
                  <p className="truncate font-mono text-[0.6rem] text-white/60" title={meta.path}>
                    {meta.path}
                  </p>
                )}
                <p className="text-[0.6rem] text-white/50">
                  Closed {formatRelativeTime(item.closedAt)}
                </p>
              </div>
              <button
                onClick={() => onRestoreRequest(item, idx)}
                className="rounded-full border border-ub-orange/50 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-ub-orange transition hover:bg-ub-orange/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
              >
                Restore
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

