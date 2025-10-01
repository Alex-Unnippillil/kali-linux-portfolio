'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import caseData from '../../apps/autopsy/data/case.json';
import artifactsData from '../apps/autopsy/data/sample-artifacts.json';
import savedViewsData from '../../apps/autopsy/data/saved-views.json';
import workspaceStore from '../../utils/workspaceStore';

interface FileNode {
  name: string;
  thumbnail?: string;
  children?: FileNode[];
}

interface ArtifactEntry {
  name: string;
  type: string;
  description: string;
  size: number;
  plugin?: string;
  timestamp: string;
  user?: string;
  runId?: string;
}

interface SavedViewDefinition {
  id: string;
  title: string;
  description: string;
}

type QuickOpenCategory = 'file' | 'run' | 'view';

type FocusTarget =
  | { kind: 'file'; path: string }
  | { kind: 'run'; runId: string }
  | { kind: 'view'; viewId: string };

interface QuickOpenItem {
  id: string;
  label: string;
  detail: string;
  category: QuickOpenCategory;
  keywords: string[];
  appId: string;
  focus: FocusTarget;
}

interface RankedItem {
  item: QuickOpenItem;
  score: number;
  matchText?: string;
}

const toRunId = (index: number) => `RUN-${String(index + 1).padStart(3, '0')}`;

const flattenFileTree = (node: FileNode | undefined, path: string[]): QuickOpenItem[] => {
  if (!node) return [];
  const currentPath = [...path, node.name];
  if (!node.children || node.children.length === 0) {
    if (path.length === 0) return [];
    const displayPath = currentPath.slice(1).join('/');
    return [
      {
        id: `file:${displayPath}`,
        label: node.name,
        detail: displayPath,
        category: 'file',
        keywords: [displayPath],
        appId: 'autopsy',
        focus: { kind: 'file', path: displayPath },
      },
    ];
  }
  return node.children.flatMap((child) =>
    flattenFileTree(child, node.name === 'root' ? [] : currentPath)
  );
};

const buildFileItems = (): QuickOpenItem[] => {
  const payload = caseData as { fileTree?: FileNode };
  return flattenFileTree(payload.fileTree, []);
};

const buildRunItems = (): { items: QuickOpenItem[]; artifacts: ArtifactEntry[] } => {
  const entries = (artifactsData as ArtifactEntry[]).map((artifact, index) => ({
    ...artifact,
    runId: artifact.runId ?? toRunId(index),
  }));
  const items: QuickOpenItem[] = entries.map((artifact) => ({
    id: `run:${artifact.runId}`,
    label: artifact.runId!,
    detail: `${artifact.name} — ${new Date(artifact.timestamp).toLocaleString()}`,
    category: 'run',
    keywords: [
      artifact.name,
      artifact.description,
      artifact.plugin ?? '',
      artifact.user ?? '',
      artifact.runId!,
    ],
    appId: 'autopsy',
    focus: { kind: 'run', runId: artifact.runId! },
  }));
  return { items, artifacts: entries };
};

const buildViewItems = (): QuickOpenItem[] => {
  const defs = savedViewsData as SavedViewDefinition[];
  return defs.map((view) => ({
    id: `view:${view.id}`,
    label: view.title,
    detail: view.description,
    category: 'view',
    keywords: [view.title, view.description],
    appId: 'autopsy',
    focus: { kind: 'view', viewId: view.id },
  }));
};

const FILE_ITEMS = buildFileItems();
const { items: RUN_ITEMS } = buildRunItems();
const VIEW_ITEMS = buildViewItems();

const ALL_ITEMS: QuickOpenItem[] = [...RUN_ITEMS, ...FILE_ITEMS, ...VIEW_ITEMS];

const DEFAULT_ITEMS: QuickOpenItem[] = [
  ...VIEW_ITEMS,
  ...RUN_ITEMS.slice(0, 3),
  ...FILE_ITEMS.slice(0, 4),
];

const categoryLabel: Record<QuickOpenCategory, string> = {
  file: 'File',
  run: 'Run ID',
  view: 'Saved View',
};

const computeScore = (query: string, text: string): number | null => {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const t = text.toLowerCase();
  if (t === q) return 2000 + q.length;
  if (t.startsWith(q)) return 1500 + q.length * 2;
  const index = t.indexOf(q);
  if (index !== -1) return 1200 + q.length * 2 - index;
  let ti = 0;
  let penalty = 0;
  for (const char of q) {
    const found = t.indexOf(char, ti);
    if (found === -1) return null;
    penalty += found - ti;
    ti = found + 1;
  }
  return 800 - penalty - (ti - q.length);
};

const rankItems = (items: QuickOpenItem[], query: string): RankedItem[] => {
  const trimmed = query.trim();
  if (!trimmed) {
    return DEFAULT_ITEMS.map((item, index) => ({
      item,
      score: DEFAULT_ITEMS.length - index,
    }));
  }
  return items
    .map((item) => {
      const scores = [
        computeScore(trimmed, item.label),
        computeScore(trimmed, item.detail),
        ...item.keywords.map((keyword) => computeScore(trimmed, keyword)),
      ].filter((value): value is number => value !== null);
      if (scores.length === 0) return null;
      const best = Math.max(...scores);
      const categoryBoost = item.category === 'run' ? 50 : item.category === 'view' ? 30 : 0;
      return { item, score: best + categoryBoost };
    })
    .filter((entry): entry is RankedItem => entry !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.item.label.localeCompare(b.item.label);
    })
    .slice(0, 20);
};

const highlightMatch = (text: string, query: string): React.ReactNode => {
  if (!query) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const index = lower.indexOf(q);
  if (index === -1) return text;
  const end = index + q.length;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-ub-orange/70 text-black">{text.slice(index, end)}</mark>
      {text.slice(end)}
    </>
  );
};

const isTextInput = (element: EventTarget | null): boolean => {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    element.isContentEditable
  );
};

const QuickOpen: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [recentQueries, setRecentQueries] = useState<string[]>(() =>
    workspaceStore.getRecentQueries(workspaceStore.getState().activeWorkspace)
  );
  const [activeWorkspace, setActiveWorkspace] = useState<number>(
    workspaceStore.getState().activeWorkspace
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => rankItems(ALL_ITEMS, query), [query]);

  useEffect(() => {
    const unsubscribe = workspaceStore.subscribe((state) => {
      setActiveWorkspace(state.activeWorkspace);
      setRecentQueries(
        workspaceStore.getRecentQueries(state.activeWorkspace)
      );
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setSelected(0);
      setRecentQueries(
        workspaceStore.getRecentQueries(activeWorkspace)
      );
    }
  }, [open, activeWorkspace]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (results.length === 0) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelected((prev) => Math.min(prev + 1, results.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelected((prev) => Math.max(prev - 1, 0));
      } else if (event.key === 'Home') {
        event.preventDefault();
        setSelected(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        setSelected(results.length - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results.length]);

  useEffect(() => {
    if (!open) {
      const handler = (event: KeyboardEvent) => {
        if (!((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')) {
          return;
        }
        if (isTextInput(event.target)) return;
        event.preventDefault();
        setOpen(true);
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!listRef.current) return;
    const el = listRef.current.children[selected] as HTMLElement | undefined;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [selected, open]);

  const closeOverlay = useCallback(() => {
    setOpen(false);
    setQuery('');
    setSelected(0);
  }, []);

  const recordQuery = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    workspaceStore.addRecentQuery(trimmed);
    setRecentQueries(
      workspaceStore.getRecentQueries(activeWorkspace)
    );
  }, [activeWorkspace]);

  const focusAutopsy = useCallback((focus: FocusTarget) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('open-app', { detail: 'autopsy' }));
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('autopsy-focus', { detail: focus }));
    }, 50);
  }, []);

  const selectItem = useCallback((item: QuickOpenItem) => {
    focusAutopsy(item.focus);
    recordQuery(query);
    closeOverlay();
  }, [closeOverlay, focusAutopsy, query, recordQuery]);

  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chosen = results[selected]?.item;
    if (chosen) {
      selectItem(chosen);
    }
  }, [results, selected, selectItem]);

  const handleBackgroundClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === overlayRef.current) {
      closeOverlay();
    }
  }, [closeOverlay]);

  const handleRecentClick = useCallback((value: string) => {
    setQuery(value);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const listboxId = 'quick-open-results';

  return (
    <>
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-24"
          role="presentation"
          onMouseDown={handleBackgroundClick}
        >
          <div
            className="w-[min(32rem,92vw)] overflow-hidden rounded-lg bg-ub-grey text-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-open-title"
          >
            <form onSubmit={handleSubmit} className="border-b border-white/10">
              <div className="px-4 py-3">
                <label
                  htmlFor="quick-open-input"
                  id="quick-open-title"
                  className="text-xs uppercase tracking-wide text-white/60"
                >
                  Quick Open
                </label>
                <input
                  id="quick-open-input"
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search run history, files, views"
                  className="mt-2 w-full rounded-md bg-black/40 px-3 py-2 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                  aria-controls={listboxId}
                  autoComplete="off"
                />
              </div>
            </form>
            <div className="max-h-80 overflow-y-auto" role="presentation">
              {recentQueries.length > 0 && query.trim() === '' && (
                <div className="px-4 py-3 border-b border-white/10">
                  <div className="text-xs uppercase tracking-wide text-white/50 mb-2">
                    Recent searches (workspace {activeWorkspace + 1})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentQueries.map((value) => (
                      <button
                        key={`recent-${value}`}
                        type="button"
                        onClick={() => handleRecentClick(value)}
                        className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 transition hover:border-ub-orange hover:text-white"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-activedescendant={results[selected] ? `quick-open-item-${selected}` : undefined}
                className="divide-y divide-white/10"
              >
                {results.map(({ item }, index) => {
                  const isSelected = index === selected;
                  return (
                    <li
                      key={item.id}
                      id={`quick-open-item-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      className={
                        isSelected
                          ? 'bg-ub-orange/20'
                          : 'bg-transparent'
                      }
                    >
                      <button
                        type="button"
                        onClick={() => selectItem(item)}
                        className={`flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition hover:bg-white/10 focus:outline-none focus-visible:bg-white/10 ${
                          isSelected ? 'ring-0' : ''
                        }`}
                      >
                        <span className="text-sm font-semibold">
                          {highlightMatch(item.label, query)}
                        </span>
                        <span className="text-xs text-white/70">
                          {highlightMatch(item.detail, query)}
                        </span>
                        <span className="text-[11px] uppercase tracking-wide text-ub-orange/80">
                          {categoryLabel[item.category]}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {results.length === 0 && (
                  <li className="px-4 py-6 text-sm text-white/60" role="option" aria-selected="false">
                    No matches found.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuickOpen;
