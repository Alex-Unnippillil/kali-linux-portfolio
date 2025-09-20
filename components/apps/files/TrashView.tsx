'use client';

import { TrashHistoryEntry, TrashItem } from '../../../apps/trash/state';
import HistoryList from '../../../apps/trash/components/HistoryList';
import { formatBytes, LARGE_ITEM_THRESHOLD } from '../../../utils/files/trash';

interface TrashViewProps {
  items: TrashItem[];
  history: TrashHistoryEntry[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onRestore: () => void;
  onDelete: () => void;
  onPurge: () => void;
  onRestoreAll: () => void;
  onEmpty: () => void;
  emptyCountdown: number | null;
  purgeDays: number;
  totalSize: number;
  largeItems: TrashItem[];
  onRestoreHistory: (index: number) => void;
  onRestoreHistoryAll: () => void;
}

const DEFAULT_ICON = '/themes/Yaru/system/folder.png';
const EMPTY_ICON = '/themes/Yaru/status/user-trash-symbolic.svg';
const FULL_ICON = '/themes/Yaru/status/user-trash-full-symbolic.svg';

const formatAge = (closedAt: number): string => {
  const diff = Date.now() - closedAt;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  return 'Just now';
};

const daysLeft = (closedAt: number, purgeDays: number): number =>
  Math.max(
    purgeDays - Math.floor((Date.now() - closedAt) / (24 * 60 * 60 * 1000)),
    0,
  );

export default function TrashView({
  items,
  history,
  selectedIndex,
  onSelect,
  onRestore,
  onDelete,
  onPurge,
  onRestoreAll,
  onEmpty,
  emptyCountdown,
  purgeDays,
  totalSize,
  largeItems,
  onRestoreHistory,
  onRestoreHistoryAll,
}: TrashViewProps) {
  const hasItems = items.length > 0;
  const emptyLabel = emptyCountdown !== null
    ? `Emptying in ${emptyCountdown}`
    : totalSize > 0
      ? `Empty (${formatBytes(totalSize)})`
      : 'Empty';

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <div className="flex items-center justify-between w-full bg-ub-warm-grey bg-opacity-40 text-sm">
        <span className="font-bold ml-2">Trash</span>
        <div className="flex flex-col items-end text-[11px] text-gray-300 mr-2">
          <span>Retention: {purgeDays} day{purgeDays === 1 ? '' : 's'}</span>
          <span>Estimated size: {formatBytes(totalSize)}</span>
        </div>
      </div>
      {largeItems.length > 0 && (
        <div className="m-2 rounded border border-yellow-600 bg-yellow-900 bg-opacity-40 px-3 py-2 text-xs text-yellow-200">
          Warning: {largeItems.length} item{largeItems.length === 1 ? '' : 's'} exceed{' '}
          {formatBytes(LARGE_ITEM_THRESHOLD)}. Emptying may take longer.
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col items-center justify-center mt-12 space-y-1.5">
          <img
            src={hasItems ? FULL_ICON : EMPTY_ICON}
            alt={hasItems ? 'Full trash' : 'Empty trash'}
            className="h-16 w-16 opacity-60"
          />
          {!hasItems && <span>Trash is empty</span>}
        </div>
        {hasItems && (
          <ul className="p-2 space-y-1.5 mt-4">
            {items.map((item, idx) => (
              <li
                key={item.closedAt}
                tabIndex={0}
                onClick={() => onSelect(selectedIndex === idx ? null : idx)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(selectedIndex === idx ? null : idx);
                  }
                }}
                className={`flex items-center h-9 px-1 cursor-pointer ${selectedIndex === idx ? 'bg-ub-drk-abrgn' : ''}`}
              >
                <img
                  src={item.icon || DEFAULT_ICON}
                  alt=""
                  className="h-4 w-4 mr-2"
                />
                <div className="flex flex-col flex-1 overflow-hidden">
                  <span className="truncate font-mono" title={item.title}>
                    {item.title}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide opacity-70">
                    Closed {formatAge(item.closedAt)} • Purges in {daysLeft(item.closedAt, purgeDays)} day
                    {daysLeft(item.closedAt, purgeDays) === 1 ? '' : 's'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex items-center justify-between w-full bg-ub-warm-grey bg-opacity-40 text-sm p-2">
        <div className="flex items-center">
          <button
            onClick={onRestore}
            disabled={selectedIndex === null}
            className="px-3 py-1 mr-2 rounded bg-blue-600 text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          >
            Restore
          </button>
          <button
            onClick={onDelete}
            disabled={selectedIndex === null}
            className="px-3 py-1 mr-2 rounded bg-red-600 text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={onPurge}
            disabled={selectedIndex === null}
            className="px-3 py-1 mr-2 rounded bg-yellow-600 text-white hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          >
            Purge
          </button>
        </div>
        <div className="flex items-center">
          <button
            onClick={onRestoreAll}
            disabled={!hasItems}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 mr-2 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Restore All
          </button>
          <button
            onClick={onEmpty}
            disabled={!hasItems || emptyCountdown !== null}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            {emptyLabel}
          </button>
        </div>
      </div>
      <HistoryList
        history={history}
        onRestore={onRestoreHistory}
        onRestoreAll={onRestoreHistoryAll}
      />
    </div>
  );
}
