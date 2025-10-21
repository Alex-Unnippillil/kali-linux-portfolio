'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Modal from '../../components/base/Modal';
import { loadAppRegistry, type AppMetadata } from '../../lib/appRegistry';
import HistoryList from './components/HistoryList';
import useTrashState, { TrashItem } from './state';

const DEFAULT_ICON = '/themes/Yaru/system/folder.png';
const EMPTY_ICON = '/themes/Yaru/status/user-trash-symbolic.svg';
const FULL_ICON = '/themes/Yaru/status/user-trash-full-symbolic.svg';

type ViewMode = 'gallery' | 'list';
type DateFilter = 'any' | '24h' | '7d' | '30d';

type ActionType =
  | 'restore'
  | 'delete'
  | 'purge'
  | 'restoreAll'
  | 'empty'
  | 'restore-history'
  | 'restore-history-all';

interface PendingAction {
  type: ActionType;
  item?: TrashItem;
  historyIndex?: number;
}

interface ActionCopy {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'positive' | 'critical';
}

const VIEW_MODE_KEY = 'trash-view-mode';
const TYPE_FILTER_KEY = 'trash-type-filters';
const DATE_FILTER_KEY = 'trash-date-filter';

const TYPE_LABELS = [
  'Security Tools',
  'Productivity',
  'Games',
  'Media & Web',
  'Utilities',
] as const;

const DATE_FILTERS: Record<DateFilter, { label: string; maxAge?: number }> = {
  any: { label: 'Any time' },
  '24h': { label: 'Last 24 hours', maxAge: 24 * 60 * 60 * 1000 },
  '7d': { label: 'Last 7 days', maxAge: 7 * 24 * 60 * 60 * 1000 },
  '30d': { label: 'Last 30 days', maxAge: 30 * 24 * 60 * 60 * 1000 },
};

const deriveType = (id: string): (typeof TYPE_LABELS)[number] => {
  if (
    /(?:hydra|john|wps|nmap|volatility|autopsy|metasploit|wireshark|beef|spoof|recon|nessus|nikto|sekurlsa|post|network|spoofing|wps)/.test(
      id,
    )
  ) {
    return 'Security Tools';
  }
  if (
    /(?:notes|sticky|todo|project|converter|calculator|password|subnet|timer|weather|qr|contact|trash|settings)/.test(
      id,
    )
  ) {
    return 'Productivity';
  }
  if (/2048|blackjack|connect|checkers|gomoku|simon|pinball|tower|solitaire|word|sokoban|minesweeper|phaser|pinball|tower-defense/.test(id)) {
    return 'Games';
  }
  if (/spotify|firefox|vscode|video|media/.test(id)) {
    return 'Media & Web';
  }
  return 'Utilities';
};

const formatRelativeTime = (closedAt: number): string => {
  const diff = Date.now() - closedAt;
  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  return 'Moments ago';
};

const passesDateFilter = (filter: DateFilter, closedAt: number): boolean => {
  const rule = DATE_FILTERS[filter];
  if (!rule.maxAge) return true;
  return Date.now() - closedAt <= rule.maxAge;
};

const chipClass = (active: boolean) =>
  `rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
    active
      ? 'bg-gradient-to-r from-ub-orange/90 to-ub-pink/80 text-white shadow-lg shadow-ub-orange/30'
      : 'bg-white/5 text-white/70 hover:bg-white/10'
  }`;

const viewToggleClass = (active: boolean) =>
  `flex items-center justify-center rounded-full border px-2.5 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
    active
      ? 'border-ub-orange/60 bg-ub-orange/20 text-white'
      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
  }`;

const actionCopy: Record<ActionType, ActionCopy> = {
  restore: {
    title: 'Restore window',
    description: 'Re-open this window and move it back to your workspace.',
    confirmLabel: 'Restore',
    tone: 'positive',
  },
  delete: {
    title: 'Move to Recently Deleted',
    description: 'Hide this window from Trash but keep it available to undo for a little while.',
    confirmLabel: 'Move to history',
    tone: 'critical',
  },
  purge: {
    title: 'Delete forever',
    description: 'Remove this window permanently. This action cannot be undone.',
    confirmLabel: 'Delete forever',
    tone: 'critical',
  },
  restoreAll: {
    title: 'Restore all windows',
    description: 'Re-open every window currently in Trash.',
    confirmLabel: 'Restore all',
    tone: 'positive',
  },
  empty: {
    title: 'Empty trash',
    description: 'Remove everything from Trash. Items remain in Recently Deleted for a short time.',
    confirmLabel: 'Empty trash',
    tone: 'critical',
  },
  'restore-history': {
    title: 'Restore from Recently Deleted',
    description: 'Bring this window back to Trash so you can open it again.',
    confirmLabel: 'Restore',
    tone: 'positive',
  },
  'restore-history-all': {
    title: 'Restore all from Recently Deleted',
    description: 'Return every item in Recently Deleted back to Trash.',
    confirmLabel: 'Restore all',
    tone: 'positive',
  },
};

function ActionModal({
  action,
  onCancel,
  onConfirm,
  getMetadata,
}: {
  action: PendingAction | null;
  onCancel: () => void;
  onConfirm: (action: PendingAction) => void;
  getMetadata: (id: string) => AppMetadata | undefined;
}) {
  if (!action) return null;
  const copy = actionCopy[action.type];
  const item = action.item;
  const meta = item ? getMetadata(item.id) : undefined;

  return (
    <Modal isOpen={Boolean(action)} onClose={onCancel} overlayRoot="__next">
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onCancel}
        />
        <div className="relative z-10 w-[min(420px,92vw)] rounded-3xl bg-ub-cool-grey/95 p-6 text-white shadow-2xl">
          <h2 className="text-lg font-semibold">{copy.title}</h2>
          <p className="mt-2 text-sm text-white/70">{copy.description}</p>
          {item && (
            <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Window</p>
                <p className="mt-1 font-medium text-white" title={item.title}>
                  {item.title}
                </p>
              </div>
              {meta?.path && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Original location</p>
                  <p className="mt-1 truncate font-mono text-white/70" title={meta.path}>
                    {meta.path}
                  </p>
                </div>
              )}
              <p className="text-xs text-white/60">Closed {formatRelativeTime(item.closedAt)}</p>
            </div>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(action)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
                copy.tone === 'positive'
                  ? 'bg-gradient-to-r from-ub-orange to-ub-pink text-black shadow-lg shadow-ub-orange/30 hover:from-ub-orange/90 hover:to-ub-pink/90'
                  : 'bg-red-500 text-white shadow-lg shadow-red-900/40 hover:bg-red-400'
              }`}
            >
              {copy.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Trash({ openApp }: { openApp: (id: string) => void }) {
  const {
    items,
    setItems,
    history,
    pushHistory,
    restoreFromHistory,
    restoreAllFromHistory,
  } = useTrashState();
  const [metadata, setMetadata] = useState<Record<string, AppMetadata>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('any');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [emptyCountdown, setEmptyCountdown] = useState<number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<
    | null
    | {
        message: string;
        tone: 'positive' | 'critical';
      }
  >(null);
  const [recentlyActedKey, setRecentlyActedKey] = useState<number | null>(null);

  const getMetadata = useCallback(
    (id: string) => metadata[id],
    [metadata],
  );

  useEffect(() => {
    let mounted = true;
    loadAppRegistry().then(({ metadata: registry }) => {
      if (mounted) setMetadata(registry);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedView = window.localStorage.getItem(VIEW_MODE_KEY) as ViewMode | null;
    const storedTypes = window.localStorage.getItem(TYPE_FILTER_KEY);
    const storedDate = window.localStorage.getItem(DATE_FILTER_KEY) as DateFilter | null;
    if (storedView === 'gallery' || storedView === 'list') setViewMode(storedView);
    if (storedTypes) {
      try {
        const parsed = JSON.parse(storedTypes);
        if (Array.isArray(parsed)) setTypeFilters(parsed);
      } catch {
        /* ignore */
      }
    }
    if (storedDate && storedDate in DATE_FILTERS) setDateFilter(storedDate);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TYPE_FILTER_KEY, JSON.stringify(typeFilters));
  }, [typeFilters]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DATE_FILTER_KEY, dateFilter);
  }, [dateFilter]);

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.closedAt - a.closedAt),
    [items],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortedItems.filter(item => {
      const type = deriveType(item.id);
      const meta = metadata[item.id];
      const path = meta?.path ?? `/apps/${item.id}`;
      const matchesType =
        typeFilters.length === 0 || typeFilters.includes(type);
      const matchesDate = passesDateFilter(dateFilter, item.closedAt);
      const matchesSearch =
        query.length === 0 ||
        item.title.toLowerCase().includes(query) ||
        path.toLowerCase().includes(query);
      return matchesType && matchesDate && matchesSearch;
    });
  }, [sortedItems, metadata, typeFilters, dateFilter, searchQuery]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedKey(null);
      return;
    }
    if (!filteredItems.some(item => item.closedAt === selectedKey)) {
      setSelectedKey(filteredItems[0].closedAt);
    }
  }, [filteredItems, selectedKey]);

  const selectedItem = useMemo(
    () => filteredItems.find(item => item.closedAt === selectedKey) ?? null,
    [filteredItems, selectedKey],
  );

  const notifyChange = useCallback(
    () => window.dispatchEvent(new Event('trash-change')),
    [],
  );

  const toggleTypeFilter = useCallback((type: string) => {
    setTypeFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type],
    );
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!selectedItem || pendingAction) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        setPendingAction({ type: 'delete', item: selectedItem });
      } else if (e.key === 'Enter' || e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setPendingAction({ type: 'restore', item: selectedItem });
      }
    },
    [selectedItem, pendingAction],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (!actionFeedback) return;
    const id = window.setTimeout(() => setActionFeedback(null), 3200);
    return () => window.clearTimeout(id);
  }, [actionFeedback]);

  const handleActionConfirm = useCallback(
    (action: PendingAction) => {
      setPendingAction(null);
      if (action.type === 'restore' && action.item) {
        const target = action.item;
        openApp(target.id);
        let nextSelection: number | null = null;
        setItems(prev => {
          const next = prev.filter(item => item.closedAt !== target.closedAt);
          nextSelection = next[0]?.closedAt ?? null;
          return next;
        });
        setSelectedKey(nextSelection);
        setRecentlyActedKey(target.closedAt);
        setActionFeedback({ message: `${target.title} restored`, tone: 'positive' });
        notifyChange();
        setTimeout(() => setRecentlyActedKey(null), 600);
        return;
      }

      if (action.type === 'delete' && action.item) {
        const target = action.item;
        pushHistory(target);
        let nextSelection: number | null = null;
        setItems(prev => {
          const next = prev.filter(item => item.closedAt !== target.closedAt);
          nextSelection = next[0]?.closedAt ?? null;
          return next;
        });
        setSelectedKey(nextSelection);
        setRecentlyActedKey(target.closedAt);
        setActionFeedback({
          message: `${target.title} moved to Recently Deleted`,
          tone: 'critical',
        });
        notifyChange();
        setTimeout(() => setRecentlyActedKey(null), 600);
        return;
      }

      if (action.type === 'purge' && action.item) {
        const target = action.item;
        let nextSelection: number | null = null;
        setItems(prev => {
          const next = prev.filter(item => item.closedAt !== target.closedAt);
          nextSelection = next[0]?.closedAt ?? null;
          return next;
        });
        setSelectedKey(nextSelection);
        setActionFeedback({
          message: `${target.title} permanently removed`,
          tone: 'critical',
        });
        notifyChange();
        return;
      }

      if (action.type === 'restoreAll') {
        items.forEach(item => openApp(item.id));
        setItems([]);
        setSelectedKey(null);
        setActionFeedback({ message: 'All windows restored', tone: 'positive' });
        notifyChange();
        return;
      }

      if (action.type === 'empty') {
        if (!items.length) return;
        setEmptyCountdown(3);
        const snapshot = [...items];
        let countdown = 3;
        const timer = window.setInterval(() => {
          countdown -= 1;
          if (countdown <= 0) {
            window.clearInterval(timer);
            pushHistory(snapshot);
            setItems([]);
            setSelectedKey(null);
            setEmptyCountdown(null);
            setActionFeedback({ message: 'Trash emptied', tone: 'critical' });
            notifyChange();
          } else {
            setEmptyCountdown(countdown);
          }
        }, 1000);
        return;
      }

      if (action.type === 'restore-history' && action.item && action.historyIndex !== undefined) {
        restoreFromHistory(action.historyIndex);
        setActionFeedback({ message: `${action.item.title} restored`, tone: 'positive' });
        notifyChange();
        return;
      }

      if (action.type === 'restore-history-all') {
        restoreAllFromHistory();
        setActionFeedback({ message: 'History restored', tone: 'positive' });
        notifyChange();
      }
    },
    [items, notifyChange, openApp, pushHistory, restoreAllFromHistory, restoreFromHistory, setItems],
  );

  const hasActiveFilters =
    typeFilters.length > 0 || dateFilter !== 'any' || searchQuery.trim().length > 0;

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-black/60 via-ub-cool-grey/90 to-ub-cool-grey text-white">
      <header className="border-b border-white/5 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={items.length ? FULL_ICON : EMPTY_ICON}
              alt="Trash icon"
              className="h-10 w-10"
            />
            <div>
              <h1 className="text-lg font-semibold">Trash</h1>
              <p className="text-sm text-white/60">
                Soft-deleted windows stay here for 30 days before auto-cleanup.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPendingAction({ type: 'restoreAll' })}
              disabled={items.length === 0}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange disabled:cursor-not-allowed disabled:opacity-40"
            >
              Restore all
            </button>
            <button
              type="button"
              onClick={() => setPendingAction({ type: 'empty' })}
              disabled={items.length === 0 || emptyCountdown !== null}
              className="rounded-full bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {emptyCountdown !== null ? `Emptying in ${emptyCountdown}s` : 'Empty trash'}
            </button>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-1 items-center gap-3">
            <label htmlFor="trash-search" className="sr-only">
              Search trash
            </label>
            <div className={`flex w-full items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm transition focus-within:border-ub-orange/60 focus-within:shadow-lg focus-within:shadow-ub-orange/20 ${
              hasActiveFilters
                ? 'bg-gradient-to-r from-ub-orange/10 to-ub-pink/10'
                : 'bg-black/30'
            }`}>
              <svg
                aria-hidden="true"
                className="h-4 w-4 text-white/50"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="20" y1="20" x2="16.65" y2="16.65" />
              </svg>
              <input
                id="trash-search"
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search trash"
                placeholder="Search by title or path"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 self-start">
            <span className="text-xs uppercase tracking-[0.2em] text-white/40">View</span>
            <button
              type="button"
              aria-pressed={viewMode === 'gallery'}
              onClick={() => setViewMode('gallery')}
              className={viewToggleClass(viewMode === 'gallery')}
            >
              Grid
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              className={viewToggleClass(viewMode === 'list')}
            >
              List
            </button>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by type">
            {TYPE_LABELS.map(type => (
              <button
                key={type}
                type="button"
                aria-pressed={typeFilters.includes(type)}
                onClick={() => toggleTypeFilter(type)}
                className={chipClass(typeFilters.includes(type))}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by date">
            {(Object.keys(DATE_FILTERS) as DateFilter[]).map(filter => (
              <button
                key={filter}
                type="button"
                aria-pressed={dateFilter === filter}
                onClick={() => setDateFilter(filter)}
                className={chipClass(dateFilter === filter)}
              >
                {DATE_FILTERS[filter].label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-6 overflow-hidden px-4 pb-6 pt-4 sm:px-6 lg:flex-row">
        <section
          className="flex-1 overflow-auto"
          aria-label="Trash items"
          role="listbox"
        >
          {filteredItems.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center text-white/70">
              <div className="relative h-32 w-32">
                <div className="absolute inset-0 rounded-3xl border border-dashed border-white/20" />
                <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 blur-sm" />
                <img
                  src={EMPTY_ICON}
                  alt="Empty trash"
                  className="relative z-10 mx-auto h-20 w-20 opacity-70"
                />
              </div>
              <h2 className="mt-6 text-lg font-semibold">
                {items.length === 0
                  ? 'Your trash is sparkling clean!'
                  : 'No items match these filters'}
              </h2>
              <p className="mt-2 max-w-sm text-sm text-white/60">
                {items.length === 0
                  ? 'Closed windows will land here when you dismiss them. Restore from Recently Deleted if you change your mind.'
                  : 'Try relaxing a filter or clearing the search query to see more items.'}
              </p>
            </div>
          ) : (
            <div
              className={
                viewMode === 'gallery'
                  ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'
                  : 'flex flex-col gap-3'
              }
            >
              {filteredItems.map(item => {
                const meta = metadata[item.id];
                const type = deriveType(item.id);
                const isSelected = item.closedAt === selectedKey;
                const highlight = recentlyActedKey === item.closedAt;
                const commonClasses = `w-full rounded-3xl border border-white/10 bg-black/30 p-4 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
                  isSelected ? 'ring-2 ring-ub-orange' : ''
                } ${highlight ? 'animate-pulse' : ''}`;
                return (
                  <button
                    key={`${item.id}-${item.closedAt}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    className={
                      viewMode === 'gallery'
                        ? `${commonClasses} hover:-translate-y-1 hover:bg-black/40`
                        : `${commonClasses} flex items-center gap-4 hover:bg-black/40`
                    }
                    onClick={() => setSelectedKey(item.closedAt)}
                    onFocus={() => setSelectedKey(item.closedAt)}
                  >
                    <div
                      className={
                        viewMode === 'gallery'
                          ? 'aspect-video w-full overflow-hidden rounded-2xl bg-black/30'
                          : 'h-16 w-20 overflow-hidden rounded-xl bg-black/30'
                      }
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt="Window preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ub-orange/20 to-ub-pink/20">
                          <img
                            src={item.icon || DEFAULT_ICON}
                            alt="App icon"
                            className="h-10 w-10"
                          />
                        </div>
                      )}
                    </div>
                    <div className={viewMode === 'gallery' ? 'mt-3 space-y-2' : 'flex-1 space-y-1'}>
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-white" title={item.title}>
                          {item.title}
                        </span>
                        <span className="ml-auto rounded-full bg-ub-orange/20 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-ub-orange">
                          {type}
                        </span>
                      </div>
                      <p className="truncate font-mono text-[0.65rem] text-white/60" title={meta?.path ?? `/apps/${item.id}`}>
                        {meta?.path ?? `/apps/${item.id}`}
                      </p>
                      <p className="text-[0.65rem] text-white/50">
                        Closed {formatRelativeTime(item.closedAt)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="w-full flex-shrink-0 overflow-hidden rounded-3xl border border-white/5 bg-black/20 lg:w-80">
          <div className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/50">
              Details
            </h2>
            {selectedItem ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-xl bg-black/30">
                    {selectedItem.image ? (
                      <img
                        src={selectedItem.image}
                        alt="Selected preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-ub-orange/20 to-ub-pink/20">
                        <img
                          src={selectedItem.icon || DEFAULT_ICON}
                          alt="App icon"
                          className="h-8 w-8"
                        />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold" title={selectedItem.title}>
                      {selectedItem.title}
                    </p>
                    <p className="text-xs text-white/60">{deriveType(selectedItem.id)}</p>
                  </div>
                </div>
                <dl className="space-y-3 text-xs text-white/70">
                  <div>
                    <dt className="uppercase tracking-[0.3em] text-white/40">Original location</dt>
                    <dd className="truncate font-mono text-[0.65rem]" title={getMetadata(selectedItem.id)?.path ?? `/apps/${selectedItem.id}`}>
                      {getMetadata(selectedItem.id)?.path ?? `/apps/${selectedItem.id}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.3em] text-white/40">Closed</dt>
                    <dd>{formatRelativeTime(selectedItem.closedAt)}</dd>
                  </div>
                </dl>
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingAction({ type: 'restore', item: selectedItem })}
                    className="rounded-full bg-gradient-to-r from-ub-orange to-ub-pink px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-ub-orange/30 transition hover:from-ub-orange/90 hover:to-ub-pink/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
                  >
                    Restore
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingAction({ type: 'delete', item: selectedItem })}
                      className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
                    >
                      Move to history
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingAction({ type: 'purge', item: selectedItem })}
                      className="flex-1 rounded-full border border-red-400/40 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/60">
                Select a window to view its details, restore it, or delete it permanently.
              </p>
            )}
          </div>
          <HistoryList
            history={history}
            onRestoreRequest={(item, index) =>
              setPendingAction({ type: 'restore-history', item, historyIndex: index })
            }
            onRestoreAllRequest={() => setPendingAction({ type: 'restore-history-all' })}
            getMetadata={getMetadata}
            formatRelativeTime={formatRelativeTime}
          />
        </aside>
      </div>

      {actionFeedback && (
        <div
          role="status"
          className={`pointer-events-none fixed bottom-6 right-6 z-40 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition ${
            actionFeedback.tone === 'positive'
              ? 'bg-gradient-to-r from-ub-orange to-ub-pink text-black'
              : 'bg-red-500 text-white shadow-red-900/40'
          }`}
        >
          {actionFeedback.message}
        </div>
      )}

      <ActionModal
        action={pendingAction}
        onCancel={() => setPendingAction(null)}
        onConfirm={handleActionConfirm}
        getMetadata={getMetadata}
      />
    </div>
  );
}
