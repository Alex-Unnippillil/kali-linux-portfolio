import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { toPng } from 'html-to-image';
import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';
import AddressBar from './AddressBar';
import { getCachedFavicon, cacheFavicon } from './bookmarks';

interface Tile {
  title: string;
  url: string;
}

interface TabData {
  id: number;
  url: string;
  history: string[];
  historyIndex: number;
  scroll: number;
  blocked?: boolean;
  muted?: boolean;
  pinned?: boolean;
  crashed?: boolean;
}

interface ContextMenuState {
  tabId: number;
  x: number;
  y: number;
}

const STORAGE_KEY = 'chrome-tabs';
const PINNED_STORAGE_KEY = 'chrome-tabs-pinned';
const HOME_URL = 'home://start';
const SANDBOX_FLAGS = ['allow-scripts', 'allow-forms', 'allow-popups'] as const;
const CSP = "default-src 'self'; script-src 'none'; connect-src 'none';";
const DEMO_ORIGINS = [
  'https://example.com',
  'https://developer.mozilla.org',
  'https://en.wikipedia.org',
];

const formatUrl = (value: string) => {
  let url = value.trim();
  if (!url) return HOME_URL;
  const hasProtocol = /^https?:\/\//i.test(url);
  const hasDot = /\./.test(url);
  const hasSpace = /\s/.test(url);
  if (!hasProtocol && (!hasDot || hasSpace)) {
    return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
  }
  if (!hasProtocol) url = `https://${url}`;
  return encodeURI(url);
};

const sortTabs = (list: TabData[]): TabData[] => {
  const pinned = list.filter((tab) => tab.pinned);
  const regular = list.filter((tab) => !tab.pinned);
  return [...pinned, ...regular];
};

const cloneTab = (tab: TabData): TabData => ({
  ...tab,
  history: [...tab.history],
});

const safeParse = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const readTabs = (): { tabs: TabData[]; active: number } => {
  if (typeof window === 'undefined') return { tabs: [], active: 0 };

  const stored = safeParse<{ tabs?: TabData[]; active?: number } | TabData[]>(
    localStorage.getItem(STORAGE_KEY),
  );
  const pinnedStored = safeParse<TabData[]>(localStorage.getItem(PINNED_STORAGE_KEY)) || [];

  const legacyTabs = Array.isArray(stored) ? stored : [];
  const savedTabs = Array.isArray(stored?.tabs) ? stored.tabs : legacyTabs;
  const activeFromStore = typeof (stored as { active?: number } | null)?.active === 'number'
    ? (stored as { active?: number }).active!
    : 0;

  const combined = sortTabs([
    ...pinnedStored.map((tab) => ({ ...tab, pinned: true })),
    ...savedTabs,
  ]).map((tab) => ({
    ...tab,
    blocked: tab.blocked ?? false,
    muted: tab.muted ?? false,
    pinned: tab.pinned ?? false,
    crashed: tab.crashed ?? false,
  }));

  const deduped: TabData[] = [];
  const seen = new Set<number>();
  combined.forEach((tab) => {
    if (typeof tab.id !== 'number' || seen.has(tab.id)) return;
    seen.add(tab.id);
    deduped.push(tab);
  });

  const active = seen.has(activeFromStore) ? activeFromStore : deduped[0]?.id ?? 0;
  return { tabs: deduped, active };
};

const saveTabs = (tabs: TabData[], active: number) => {
  if (typeof window === 'undefined') return;
  const ordered = sortTabs(tabs);
  const pinned = ordered.filter((tab) => tab.pinned);
  const regular = ordered.filter((tab) => !tab.pinned);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: regular, active }));
  localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinned));
};

const Chrome: React.FC = () => {
  const { tabs: storedTabs, active: storedActive } = readTabs();
  const sessionUrl =
    typeof window !== 'undefined' ? sessionStorage.getItem('chrome-last-url') : null;
  const defaultTab: TabData = {
    id: Date.now(),
    url: sessionUrl || HOME_URL,
    history: [sessionUrl || HOME_URL],
    historyIndex: 0,
    scroll: 0,
    blocked: false,
    muted: false,
    pinned: false,
    crashed: false,
  };
  const normalizedStoredTabs = storedTabs.length
    ? storedTabs.map((t) => ({
        ...t,
        blocked: t.blocked ?? false,
        muted: t.muted ?? false,
        pinned: t.pinned ?? false,
        crashed: t.crashed ?? false,
      }))
    : [];
  const initialTabs = normalizedStoredTabs.length ? sortTabs(normalizedStoredTabs) : [defaultTab];
  const hasStoredActive = normalizedStoredTabs.some((tab) => tab.id === storedActive);
  const initialActiveId = hasStoredActive ? storedActive : initialTabs[0].id;

  const [tabs, setTabs] = useState<TabData[]>(initialTabs);
  const [activeId, setActiveId] = useState<number>(initialActiveId);
  const [address, setAddress] = useState<string>(
    initialTabs.find((t) => t.id === initialActiveId)?.url || HOME_URL,
  );
  const [closedTabs, setClosedTabs] = useState<TabData[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [showFlags, setShowFlags] = useState(false);
  const [favicons, setFavicons] = useState<Record<string, string>>({});
  const tabStripRef = useRef<HTMLDivElement | null>(null);
  const tabSearchRef = useRef<HTMLInputElement | null>(null);
  const [tabQuery, setTabQuery] = useState('');
  const [overflowing, setOverflowing] = useState(false);
  const draggingId = useRef<number | null>(null);
  const dragTabId = useRef<number | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [editingTiles, setEditingTiles] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const tileFileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      let defaults: Tile[] = [];
      try {
        const mod = await import('../../../apps.config');
        defaults = mod.chromeDefaultTiles || [];
      } catch {}
      let stored: Tile[] | null = null;
      try {
        if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
          const root = await navigator.storage.getDirectory();
          const file = await root.getFileHandle('chrome-tiles.json');
          const data = await file.getFile();
          stored = JSON.parse(await data.text());
        }
      } catch {}
      setTiles(stored && Array.isArray(stored) && stored.length ? stored : defaults);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (!(typeof navigator !== 'undefined' && navigator.storage?.getDirectory)) return;
        const root = await navigator.storage.getDirectory();
        const file = await root.getFileHandle('chrome-tiles.json', { create: true });
        const writable = await file.createWritable();
        await writable.write(JSON.stringify(tiles));
      await writable.close();
    } catch {}
  })();
  }, [tiles]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('click', closeMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  const isAllowed = useCallback((url: string) => {
    if (url === HOME_URL) return true;
    try {
      const origin = new URL(url).origin;
      return DEMO_ORIGINS.includes(origin);
    } catch {
      return false;
    }
  }, []);

  const setIframeMuted = useCallback((mute: boolean) => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return false;
      doc.querySelectorAll('audio, video').forEach((el) => {
        (el as HTMLMediaElement).muted = mute;
      });
      return true;
    } catch {
      return false;
    }
  }, []);
  const [articles, setArticles] = useState<Record<number, string>>({});
  const sanitizedArticle = useMemo(
    () =>
      articles[activeId] ? DOMPurify.sanitize(articles[activeId]) : '',
    [articles, activeId],
  );

  const removeArticles = useCallback((ids: number[]) => {
    if (!ids.length) return;
    setArticles((prev) => {
      const next = { ...prev };
      ids.forEach((tabId) => {
        if (tabId in next) {
          delete next[tabId];
        }
      });
      return next;
    });
  }, []);

  const updateFavicon = useCallback(
    async (url: string) => {
      try {
        const origin = new URL(url).origin;
        if (favicons[origin]) return;
        const cached = await getCachedFavicon(origin);
        if (cached) {
          setFavicons((prev) => ({ ...prev, [origin]: cached }));
          return;
        }
        const iconUrl = `https://www.google.com/s2/favicons?sz=32&domain_url=${origin}`;
        const res = await fetch(iconUrl);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        await cacheFavicon(origin, dataUrl);
        setFavicons((prev) => ({ ...prev, [origin]: dataUrl }));
      } catch {
        /* ignore */
      }
    },
    [favicons],
  );

  useEffect(() => {
    DEMO_ORIGINS.forEach((url) => updateFavicon(url));
  }, [updateFavicon]);

  useEffect(() => {
    const el = tabStripRef.current;
    if (el) setOverflowing(el.scrollWidth > el.clientWidth);
  }, [tabs, tabQuery]);

  useEffect(() => {
    saveTabs(tabs, activeId);
  }, [tabs, activeId]);

  const filteredTabs = useMemo(
    () =>
      sortTabs(tabs).filter((t) =>
        t.url.toLowerCase().includes(tabQuery.toLowerCase()),
      ),
    [tabs, tabQuery],
  );

  const activeTab = useMemo(
    () => (tabs.find((t) => t.id === activeId) ?? tabs[0])!,
    [tabs, activeId],
  );

  const pinnedFilteredTabs = useMemo(
    () => filteredTabs.filter((t) => t.pinned),
    [filteredTabs],
  );

  const regularFilteredTabs = useMemo(
    () => filteredTabs.filter((t) => !t.pinned),
    [filteredTabs],
  );

  const hasClosedTabs = closedTabs.length > 0;
  const contextTarget = useMemo(
    () => (contextMenu ? tabs.find((t) => t.id === contextMenu.tabId) ?? null : null),
    [contextMenu, tabs],
  );
  const canCloseOthers = useMemo(
    () =>
      contextTarget
        ? tabs.some((t) => t.id !== contextTarget.id && !t.pinned)
        : false,
    [contextTarget, tabs],
  );

  useEffect(() => {
    setTabs((prev) =>
      sortTabs(
        prev.map((t) => ({ ...t, blocked: t.blocked || !isAllowed(t.url) })),
      ),
    );
  }, [isAllowed]);

  const fetchArticle = useCallback(async (tabId: number, url: string) => {
    try {
      const res = await fetch(url);
      const html = await res.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const reader = new Readability(doc);
      const parsed = reader.parse();
      if (parsed) {
        setArticles((prev) => ({ ...prev, [tabId]: parsed.content ?? '' }));
      }
    } catch {
      setArticles((prev) => ({ ...prev, [tabId]: '' }));
    }
  }, []);

  const navigate = useCallback(
    async (raw: string) => {
      const url = formatUrl(raw);
      let blocked = !isAllowed(url);
      if (!blocked) {
        try {
          const res = await fetch(url, { method: 'HEAD', mode: 'cors' });
          const xfo = res.headers.get('x-frame-options');
          const csp = res.headers.get('content-security-policy');
          if (xfo || (csp && /frame-ancestors|frame-src|child-src/.test(csp))) {
            blocked = true;
          }
        } catch {
          blocked = true;
        }
      }
      setTabs((prev) =>
        sortTabs(
          prev.map((t) =>
            t.id === activeId
              ? {
                  ...t,
                  url,
                  blocked,
                  crashed: false,
                  history: [...t.history.slice(0, t.historyIndex + 1), url],
                  historyIndex: t.historyIndex + 1,
                }
              : t,
          ),
        ),
      );
      setAddress(url);
      sessionStorage.setItem('chrome-last-url', url);
      updateFavicon(url);
      if (!blocked) {
        fetchArticle(activeId, url);
      }
    },
    [activeId, fetchArticle, isAllowed, updateFavicon],
  );

  const addTab = useCallback(
    (url: string = HOME_URL) => {
      const id = Date.now();
      setTabs((prev) =>
        sortTabs([
          ...prev,
          {
            id,
            url,
            history: [url],
            historyIndex: 0,
            scroll: 0,
            blocked: false,
            muted: false,
            pinned: false,
            crashed: false,
          },
        ]),
      );
      setActiveId(id);
      setAddress(url);
      updateFavicon(url);
      fetchArticle(id, url);
    },
    [updateFavicon, fetchArticle],
  );

  const togglePin = useCallback((id: number) => {
    setTabs((prev) => {
      if (!prev.some((t) => t.id === id)) return prev;
      const next = prev.map((t) =>
        t.id === id
          ? {
              ...t,
              pinned: !t.pinned,
            }
          : t,
      );
      return sortTabs(next);
    });
    setContextMenu(null);
  }, []);

  const closeTab = useCallback(
    (id: number) => {
      if (tabs.length <= 1) return;
      const closing = tabs.find((t) => t.id === id);
      if (!closing) return;
      setClosedTabs((prev) => [cloneTab(closing), ...prev]);
      removeArticles([id]);
      const remaining = tabs.filter((t) => t.id !== id);
      setTabs(sortTabs(remaining));
      if (id === activeId) {
        const idx = tabs.findIndex((t) => t.id === id);
        const fallback = tabs[idx - 1] || tabs[idx + 1] || remaining[0];
        if (fallback) {
          setActiveId(fallback.id);
          setAddress(fallback.url);
        }
      }
      setContextMenu(null);
    },
    [tabs, activeId, removeArticles],
  );

  const closeOthers = useCallback(
    (id: number) => {
      const target = tabs.find((t) => t.id === id);
      if (!target) return;
      const toClose = tabs.filter((t) => t.id !== id && !t.pinned);
      if (toClose.length) {
        const closedSnapshots = toClose.map(cloneTab).reverse();
        setClosedTabs((prev) => [...closedSnapshots, ...prev]);
        removeArticles(toClose.map((t) => t.id));
      }
      const remaining = tabs.filter((t) => t.id === id || t.pinned);
      setTabs(sortTabs(remaining));
      setActiveId(id);
      setAddress(target.url);
      setContextMenu(null);
    },
    [tabs, removeArticles],
  );

  const reopenClosedTab = useCallback(() => {
    if (!closedTabs.length) return;
    const [latest, ...rest] = closedTabs;
    const reopened = { ...cloneTab(latest), crashed: false };
    setClosedTabs(rest);
    setTabs((prev) => {
      if (prev.some((tab) => tab.id === reopened.id)) return prev;
      return sortTabs([...prev, reopened]);
    });
    setActiveId(reopened.id);
    setAddress(reopened.url);
    updateFavicon(reopened.url);
    if (!reopened.blocked) {
      fetchArticle(reopened.id, reopened.url);
    }
    setContextMenu(null);
  }, [closedTabs, fetchArticle, updateFavicon]);

  const handleDragStart = useCallback(
    (id: number) => () => {
      dragTabId.current = id;
    },
    [],
  );

  const handleDrop = useCallback(
    (id: number) => (e: React.DragEvent) => {
      e.preventDefault();
      const from = dragTabId.current;
      dragTabId.current = null;
      if (from === null || from === id) return;
      setTabs((prev) => {
        const next = [...prev];
        const fromIdx = next.findIndex((t) => t.id === from);
        const toIdx = next.findIndex((t) => t.id === id);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const [moved] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, moved);
        return sortTabs(next);
      });
    },
    [],
  );

  const allowDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const reload = useCallback(() => {
    setTabs((prev) =>
      sortTabs(prev.map((t) => (t.id === activeId ? { ...t, crashed: false } : t))),
    );
    iframeRef.current?.contentWindow?.location.reload();
  }, [activeId]);

  const stop = useCallback(() => {
    iframeRef.current?.contentWindow?.stop();
  }, []);

  const handleIframeLoad = useCallback(() => {
    setTabs((prev) =>
      sortTabs(prev.map((t) => (t.id === activeId ? { ...t, crashed: false } : t))),
    );
  }, [activeId]);

  const handleIframeError = useCallback(() => {
    setTabs((prev) =>
      sortTabs(prev.map((t) => (t.id === activeId ? { ...t, crashed: true } : t))),
    );
  }, [activeId]);

  const goBack = useCallback(() => {
    setTabs((prev) =>
      sortTabs(
        prev.map((t) =>
          t.id === activeId && t.historyIndex > 0
            ? {
                ...t,
                historyIndex: t.historyIndex - 1,
                url: t.history[t.historyIndex - 1],
                crashed: false,
              }
            : t,
        ),
      ),
    );
  }, [activeId]);

  const goForward = useCallback(() => {
    setTabs((prev) =>
      sortTabs(
        prev.map((t) =>
          t.id === activeId && t.historyIndex < t.history.length - 1
            ? {
                ...t,
                historyIndex: t.historyIndex + 1,
                url: t.history[t.historyIndex + 1],
                crashed: false,
              }
            : t,
        ),
      ),
    );
  }, [activeId]);

  useEffect(() => {
    setAddress(activeTab.url);
  }, [activeTab.url]);

  useEffect(() => {
    updateFavicon(activeTab.url);
    sessionStorage.setItem('chrome-last-url', activeTab.url);
  }, [activeTab.url, updateFavicon]);

  useEffect(() => {
    if (
      !activeTab.blocked &&
      !activeTab.crashed &&
      isAllowed(activeTab.url) &&
      !articles[activeId]
    ) {
      fetchArticle(activeId, activeTab.url);
    }
    if (!setIframeMuted(!!activeTab.muted) && activeTab.muted) {
      setTabs((prev) =>
        sortTabs(prev.map((t) => (t.id === activeId ? { ...t, muted: false } : t))),
      );

    }
  }, [
    activeId,
    activeTab.url,
    activeTab.muted,
    activeTab.blocked,
    activeTab.crashed,
    articles,
    fetchArticle,
    setIframeMuted,
    isAllowed,
  ]);

  useEffect(() => {
    const handleScroll = () => {
      try {
        setTabs((prev) =>
          sortTabs(
            prev.map((t) =>
              t.id === activeId
                ? { ...t, scroll: iframeRef.current?.contentWindow?.scrollY || 0 }
                : t
            )
          )
        );
      } catch {
        /* ignore cross-origin */
      }
    };
    const win = iframeRef.current?.contentWindow;
    win?.addEventListener('scroll', handleScroll);
    return () => win?.removeEventListener('scroll', handleScroll);
  }, [activeId]);

  useEffect(() => {
    try {
      const frameWindow = iframeRef.current?.contentWindow;
      const { scrollTo } = frameWindow || {};
      if (
        typeof scrollTo === 'function' &&
        !String(scrollTo).includes('notImplemented')
      ) {
        scrollTo.call(frameWindow, 0, activeTab.scroll);
      }
    } catch {
      /* ignore cross-origin */
    }
  }, [activeTab.id, activeTab.scroll]);

  const doFind = useCallback(() => {
    try {
      (iframeRef.current?.contentWindow as any)?.find(searchTerm);
    } catch {
      /* ignore */
    }
  }, [searchTerm]);

  const toggleMute = useCallback(() => {
    const next = !activeTab.muted;
    if (setIframeMuted(next)) {
      setTabs((prev) =>
        sortTabs(prev.map((t) => (t.id === activeId ? { ...t, muted: next } : t))),
      );
    } else {
      console.warn('Unable to control audio for this site.');

    }
  }, [activeId, activeTab.muted, setIframeMuted]);

  const moveTile = useCallback((idx: number, delta: number) => {
    setTiles((prev) => {
      const next = [...prev];
      const n = idx + delta;
      if (n < 0 || n >= next.length) return prev;
      const [item] = next.splice(idx, 1);
      next.splice(n, 0, item);
      return next;
    });
  }, []);

  const removeTile = useCallback((idx: number) => {
    setTiles((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addTile = useCallback(() => {
    if (!newUrl.trim()) return;
    setTiles((prev) => [...prev, { title: newTitle || newUrl, url: newUrl }]);
    setNewTitle('');
    setNewUrl('');
  }, [newTitle, newUrl]);

  const exportTiles = useCallback(() => {
    const blob = new Blob([JSON.stringify(tiles, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tiles.json';
    a.click();
  }, [tiles]);

  const importTiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) setTiles(parsed);
      } catch {}
    },
    [],
  );

  const screenshot = useCallback(async () => {
    if (!iframeRef.current) return;
    try {
      const dataUrl = await toPng(iframeRef.current);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'screenshot.png';
      a.click();
    } catch {
      /* ignore */
    }
  }, []);

  const homeGrid = (
    <div className="p-4 space-y-2 text-black">
      <div className="flex items-center justify-between">
        <span className="font-bold">Tiles</span>
        <div className="space-x-2">
          <button
            onClick={() => setEditingTiles((e) => !e)}
            className="px-2 py-1 bg-gray-200 rounded"
          >
            {editingTiles ? 'Done' : 'Edit'}
          </button>
          {editingTiles && (
            <>
              <button
                onClick={exportTiles}
                className="px-2 py-1 bg-gray-200 rounded"
              >
                Export
              </button>
              <button
                onClick={() => tileFileInput.current?.click()}
                className="px-2 py-1 bg-gray-200 rounded"
              >
                Import
              </button>
              <input
                ref={tileFileInput}
                type="file"
                accept="application/json"
                onChange={importTiles}
                className="hidden"
              />
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {tiles.map((t, i) => (
          <div key={i} className="flex flex-col items-center">
            {editingTiles && (
              <div className="mb-1 space-x-1">
                <button onClick={() => moveTile(i, -1)}>↑</button>
                <button onClick={() => moveTile(i, 1)}>↓</button>
                <button onClick={() => removeTile(i)}>×</button>
              </div>
            )}
            {(() => {
              try {
                const origin = new URL(t.url).origin;
                return (
                  <img
                    src={`https://www.google.com/s2/favicons?sz=64&domain_url=${origin}`}
                    alt=""
                    className="w-8 h-8 mb-1"
                  />
                );
              } catch {
                return null;
              }
            })()}
            {editingTiles ? (
              <span>{t.title}</span>
            ) : (
              <button
                onClick={() => navigate(t.url)}
                className="text-blue-600 underline"
              >
                {t.title}
              </button>
            )}
          </div>
        ))}
      </div>
      {editingTiles && (
        <div className="space-x-1">
          <input
            className="px-1 text-black border rounded"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <input
            className="px-1 text-black border rounded"
            placeholder="URL"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <button
            onClick={addTile}
            className="px-2 py-1 bg-gray-200 rounded"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );

  const onTabStripKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (tabs.length === 0) return;
      const idx = tabs.findIndex((t) => t.id === activeId);
      if (e.key === 'ArrowRight') {
        const next = tabs[(idx + 1) % tabs.length];
        setActiveId(next.id);
        setAddress(next.url);
        document.getElementById(`tab-${next.id}`)?.scrollIntoView({
          inline: 'nearest',
        });
      } else if (e.key === 'ArrowLeft') {
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length];
        setActiveId(prev.id);
        setAddress(prev.url);
        document.getElementById(`tab-${prev.id}`)?.scrollIntoView({
          inline: 'nearest',
        });
      } else if (e.key === 'Delete') {
        closeTab(activeId);
      } else if (e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        tabSearchRef.current?.focus();
      }
    },
    [tabs, activeId, closeTab],
  );

  const onDragStart = useCallback(
    (id: number) => (e: React.DragEvent<HTMLDivElement>) => {
      draggingId.current = id;
      e.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  const onDrop = useCallback(
    (id: number) => (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const from = draggingId.current;
      if (from === null || from === id) return;
      setTabs((prev) => {
        const fromIdx = prev.findIndex((t) => t.id === from);
        const toIdx = prev.findIndex((t) => t.id === id);
        if (fromIdx < 0 || toIdx < 0) return prev;
        const newTabs = [...prev];
        const [moved] = newTabs.splice(fromIdx, 1);
        newTabs.splice(toIdx, 0, moved);
        return sortTabs(newTabs);
      });
      draggingId.current = null;
    },
    [],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const renderTab = (t: TabData) => {
    const isActive = t.id === activeId;
    const label = t.url.replace(/^https?:\/\/(www\.)?/, '');
    const canClose = !t.pinned && tabs.length > 1;
    const faviconNode = (() => {
      try {
        const origin = new URL(t.url).origin;
        const src = favicons[origin];
        return src ? (
          <img src={src} alt="" className="w-4 h-4 flex-shrink-0" />
        ) : null;
      } catch {
        return null;
      }
    })();

    return (
      <div
        key={t.id}
        id={`tab-${t.id}`}
        role="tab"
        aria-selected={isActive}
        data-pinned={t.pinned ? 'true' : 'false'}
        className={`group flex items-center px-2 py-1 cursor-pointer rounded-sm space-x-1 ${
          isActive ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'
        } ${t.pinned ? 'min-w-[60px]' : ''}`}
        onClick={() => {
          setActiveId(t.id);
          setAddress(t.url);
          setContextMenu(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({ tabId: t.id, x: e.clientX, y: e.clientY });
        }}
        draggable
        onDragStart={onDragStart(t.id)}
        onDragOver={onDragOver}
        onDrop={onDrop(t.id)}
        title={t.url}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePin(t.id);
          }}
          aria-label={t.pinned ? 'Unpin tab' : 'Pin tab'}
          className="text-xs"
        >
          {t.pinned ? '📌' : '📍'}
        </button>
        {faviconNode}
        <span className="truncate" style={{ maxWidth: t.pinned ? 72 : 120 }}>
          {label}
        </span>
        {t.muted && <span className="ml-1">🔇</span>}
        {t.crashed && (
          <span className="ml-1" role="img" aria-label="Tab crashed">
            💥
          </span>
        )}
        {canClose && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              closeTab(t.id);
            }}
            aria-label="Close Tab"
            className="ml-1 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>
    );
  };

  const crashedView = (
    <div className="flex flex-col items-center justify-center w-full h-full text-center p-4">
      <p className="mb-2">This tab has crashed.</p>
      <p className="mb-4 text-sm">Reload to try the page again.</p>
      <button
        type="button"
        onClick={reload}
        className="px-3 py-1 bg-gray-800 text-white rounded"
      >
        Reload tab
      </button>
    </div>
  );

  const blockedView = (
    <div className="flex flex-col items-center justify-center w-full h-full text-center p-4">
      <p className="mb-2">This site refused to connect in the sandbox.</p>
      <p className="mb-4 text-sm">Open it in a regular tab for full functionality.</p>
      <a
        href={activeTab.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline"
      >
        Open externally
      </a>
    </div>
  );

  return (
    <div className="flex flex-col w-full h-full bg-ub-cool-grey text-white">
      <div className="flex items-center bg-gray-800 text-sm p-1 space-x-1">
        <button onClick={goBack} aria-label="Back" className="px-2">◀</button>
        <button onClick={goForward} aria-label="Forward" className="px-2">▶</button>
        <button onClick={reload} aria-label="Reload" className="px-2">↻</button>
        <button onClick={stop} aria-label="Stop" className="px-2">✕</button>
        <button
          onClick={toggleMute}
          aria-label={activeTab.muted ? 'Unmute' : 'Mute'}
          className="px-2"
        >
          {activeTab.muted ? '🔇' : '🔊'}
        </button>
        <button
          onClick={() => window.open(activeTab.url, '_blank', 'noopener,noreferrer')}
          aria-label="Open externally"
          title="Sandbox restrictions may block features"
          className="px-2"
        >
          ↗
        </button>
        <button
          onClick={() => setShowFlags((s) => !s)}
          aria-label="Show sandbox flags"
          className="px-2"
        >
          ⚑
        </button>
        <AddressBar
          value={address}
          onChange={setAddress}
          onNavigate={navigate}
          onOpenNewTab={(url) => addTab(url)}
          onOpenNewWindow={(url) => window.open(url, '_blank')}
          historyList={tabs.find((t) => t.id === activeId)?.history}
        />
        <button onClick={() => addTab()} aria-label="New Tab" className="px-2">
          +
        </button>
      </div>
      <div
        className="flex space-x-1 bg-gray-700 text-sm overflow-x-auto"
        ref={tabStripRef}
        tabIndex={0}
        onKeyDown={onTabStripKeyDown}
        role="tablist"
        aria-label="Tabs"
      >
        {pinnedFilteredTabs.map((t) => renderTab(t))}
        {pinnedFilteredTabs.length > 0 && regularFilteredTabs.length > 0 && (
          <div className="w-px bg-gray-600 my-1" aria-hidden="true" />
        )}
        {regularFilteredTabs.map((t) => renderTab(t))}
      </div>
      {contextMenu && contextTarget && (
        <div
          role="menu"
          className="fixed z-50 bg-gray-800 text-white text-sm rounded border border-gray-600 shadow-lg"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full text-left px-3 py-1 hover:bg-gray-700"
            onClick={() => togglePin(contextMenu.tabId)}
          >
            {contextTarget.pinned ? 'Unpin tab' : 'Pin tab'}
          </button>
          <button
            type="button"
            role="menuitem"
            className={`block w-full text-left px-3 py-1 hover:bg-gray-700 ${
              tabs.length <= 1 ? 'opacity-60 cursor-not-allowed hover:bg-gray-800' : ''
            }`}
            onClick={() => closeTab(contextMenu.tabId)}
            disabled={tabs.length <= 1}
          >
            Close tab
          </button>
          <button
            type="button"
            role="menuitem"
            className={`block w-full text-left px-3 py-1 hover:bg-gray-700 ${
              !canCloseOthers ? 'opacity-60 cursor-not-allowed hover:bg-gray-800' : ''
            }`}
            onClick={() => closeOthers(contextMenu.tabId)}
            disabled={!canCloseOthers}
          >
            Close other tabs
          </button>
          <button
            type="button"
            role="menuitem"
            className={`block w-full text-left px-3 py-1 hover:bg-gray-700 ${
              !hasClosedTabs ? 'opacity-60 cursor-not-allowed hover:bg-gray-800' : ''
            }`}
            onClick={reopenClosedTab}
            disabled={!hasClosedTabs}
          >
            Reopen closed tab
          </button>
        </div>
      )}
      {overflowing && (
        <div className="bg-gray-700 p-1">
          <input
            ref={tabSearchRef}
            className="w-full px-2 py-1 text-black rounded"
            placeholder="Search tabs"
            value={tabQuery}
            onChange={(e) => setTabQuery(e.target.value)}
          />
        </div>
      )}
        <div className="flex-grow bg-white relative overflow-auto">
          {activeTab.url === HOME_URL ? (
            homeGrid
          ) : activeTab.crashed ? (
            crashedView
          ) : articles[activeId] ? (
            <main
              style={{ maxInlineSize: '60ch', margin: 'auto' }}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(articles[activeId] ?? '') }}
            />
          ) : activeTab.blocked ? (
            blockedView
          ) : (
            <iframe
              ref={iframeRef}
              src={activeTab.url}
              title={activeTab.url}
              className="w-full h-full"
              sandbox={SANDBOX_FLAGS.join(' ')}
              // @ts-ignore - CSP is a valid attribute but not in the React types
              csp={CSP}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture; microphone; camera"
              referrerPolicy="no-referrer"
              allowFullScreen
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          )}
          {showFlags && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 space-y-1">
              <p>Active sandbox flags: {SANDBOX_FLAGS.join(', ') || '(none)'}</p>
              <p>
                Pages run in an isolated iframe. Scripts, forms and popups work, but network
                access is blocked by CSP.
              </p>
              <p>
                Note: combining <code>allow-scripts</code> with <code>allow-same-origin</code> defeats
                isolation.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

export default Chrome;
export const displayChrome = () => <Chrome />;
