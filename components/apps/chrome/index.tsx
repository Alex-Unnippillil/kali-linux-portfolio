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
import usePersistentState from '../../../hooks/usePersistentState';

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
}

const STORAGE_KEY = 'chrome-tabs';
const HOME_URL = 'home://start';
const BASE_SANDBOX_FLAGS = ['allow-forms', 'allow-popups'] as const;
const PERMISSION_KEYS = ['scripts', 'cookies'] as const;
type PermissionKey = (typeof PERMISSION_KEYS)[number];
type PermissionOverrides = Partial<Record<PermissionKey, boolean>>;
type PermissionStore = Record<string, PermissionOverrides>;
const DEFAULT_PERMISSIONS: Record<PermissionKey, boolean> = {
  scripts: true,
  cookies: false,
};
const OPTIONAL_SANDBOX_FLAGS: Record<PermissionKey, string> = {
  scripts: 'allow-scripts',
  cookies: 'allow-same-origin',
};
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

const readTabs = (): { tabs: TabData[]; active: number } => {
  if (typeof window === 'undefined') return { tabs: [], active: 0 };
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '');
    return data || { tabs: [], active: 0 };
  } catch {
    return { tabs: [], active: 0 };
  }
};

const saveTabs = (tabs: TabData[], active: number) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, active }));
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isPermissionOverrides = (value: unknown): value is PermissionOverrides => {
  if (!isRecord(value)) return false;
  return Object.entries(value).every(
    ([key, val]) =>
      PERMISSION_KEYS.includes(key as PermissionKey) && typeof val === 'boolean',
  );
};

const isPermissionStore = (value: unknown): value is PermissionStore => {
  if (!isRecord(value)) return false;
  return Object.values(value).every(isPermissionOverrides);
};

const Chrome: React.FC = () => {
  const { tabs: storedTabs, active: storedActive } = readTabs();
  const sessionUrl =
    typeof window !== 'undefined' ? sessionStorage.getItem('chrome-last-url') : null;
  const [tabs, setTabs] = useState<TabData[]>(
    storedTabs.length
      ? storedTabs.map((t) => ({ blocked: false, muted: false, ...t }))
      : [
          {
            id: Date.now(),
            url: sessionUrl || HOME_URL,
            history: [sessionUrl || HOME_URL],
            historyIndex: 0,
            scroll: 0,
            blocked: false,
            muted: false,
          },
        ]
  );
  const [activeId, setActiveId] = useState<number>(storedActive || tabs[0].id);
  const [address, setAddress] = useState<string>(tabs.find((t) => t.id === activeId)?.url || HOME_URL);
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
  const [permissionStore, setPermissionStore] = usePersistentState<PermissionStore>(
    'chrome-permissions',
    () => ({}),
    isPermissionStore,
  );
  const [showSiteSettings, setShowSiteSettings] = useState(false);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

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
      tabs.filter((t) =>
        t.url.toLowerCase().includes(tabQuery.toLowerCase()),
      ),
    [tabs, tabQuery],
  );

  const activeTab = tabs.find((t) => t.id === activeId)!;
  const activeOrigin = useMemo(() => {
    try {
      const parsed = new URL(activeTab.url);
      if (!/^https?:$/.test(parsed.protocol)) return null;
      return parsed.origin;
    } catch {
      return null;
    }
  }, [activeTab.url]);
  const activeHostname = useMemo(() => {
    if (!activeOrigin) return '';
    try {
      return new URL(activeOrigin).hostname;
    } catch {
      return activeOrigin;
    }
  }, [activeOrigin]);
  const activePermissions = useMemo(
    () => {
      const overrides = activeOrigin ? permissionStore[activeOrigin] : undefined;
      return PERMISSION_KEYS.reduce((acc, key) => {
        const overrideValue = overrides?.[key];
        acc[key] =
          overrideValue === undefined ? DEFAULT_PERMISSIONS[key] : overrideValue;
        return acc;
      }, {} as Record<PermissionKey, boolean>);
    },
    [activeOrigin, permissionStore],
  );
  const activeSandboxFlags = useMemo(() => {
    const flags = new Set<string>(BASE_SANDBOX_FLAGS);
    PERMISSION_KEYS.forEach((key) => {
      const token = OPTIONAL_SANDBOX_FLAGS[key];
      if (activePermissions[key]) {
        flags.add(token);
      } else {
        flags.delete(token);
      }
    });
    return Array.from(flags);
  }, [activePermissions]);
  const canEditPermissions = Boolean(activeOrigin);

  useEffect(() => {
    setTabs((prev) =>
      prev.map((t) => ({ ...t, blocked: t.blocked || !isAllowed(t.url) })),
    );
  }, [isAllowed]);

  useEffect(() => {
    if (!permissionNotice) return;
    const id = window.setTimeout(() => setPermissionNotice(null), 2500);
    return () => window.clearTimeout(id);
  }, [permissionNotice]);

  useEffect(() => {
    setShowSiteSettings(false);
  }, [activeOrigin]);

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
        prev.map((t) =>
          t.id === activeId
            ? {
                ...t,
                url,
                blocked,
                history: [...t.history.slice(0, t.historyIndex + 1), url],
                historyIndex: t.historyIndex + 1,
              }
            : t,
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
      setTabs((prev) => [
        ...prev,
        {
          id,
          url,
          history: [url],
          historyIndex: 0,
          scroll: 0,
          blocked: false,
          muted: false,
        },
      ]);
      setActiveId(id);
      setAddress(url);
      updateFavicon(url);
      fetchArticle(id, url);
    },
    [updateFavicon, fetchArticle],
  );

  const closeTab = useCallback(
    (id: number) => {
      setTabs((prev) => prev.filter((t) => t.id !== id));
      setArticles((prev) => {
        const { [id]: _omit, ...rest } = prev;
        return rest;
      });
      if (id === activeId && tabs.length > 1) {
        const idx = tabs.findIndex((t) => t.id === id);
        const next = tabs[idx - 1] || tabs[idx + 1];
        setActiveId(next.id);
        setAddress(next.url);
      }
  },
  [activeId, tabs],
);

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
        return next;
      });
    },
    [],
  );

  const allowDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const reload = useCallback(() => {
    iframeRef.current?.contentWindow?.location.reload();
  }, []);

  const stop = useCallback(() => {
    iframeRef.current?.contentWindow?.stop();
  }, []);

  const goBack = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeId && t.historyIndex > 0
          ? { ...t, historyIndex: t.historyIndex - 1, url: t.history[t.historyIndex - 1] }
          : t,
      ),
    );
  }, [activeId]);

  const goForward = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeId && t.historyIndex < t.history.length - 1
          ? { ...t, historyIndex: t.historyIndex + 1, url: t.history[t.historyIndex + 1] }
          : t,
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
    if (!activeTab.blocked && isAllowed(activeTab.url) && !articles[activeId]) {
      fetchArticle(activeId, activeTab.url);
    }
    if (!setIframeMuted(!!activeTab.muted) && activeTab.muted) {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, muted: false } : t)),
      );

    }
  }, [activeId, activeTab.url, activeTab.muted, articles, fetchArticle, setIframeMuted, isAllowed, activeTab.blocked]);

  useEffect(() => {
    const handleScroll = () => {
      try {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeId
              ? { ...t, scroll: iframeRef.current?.contentWindow?.scrollY || 0 }
              : t
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
      iframeRef.current?.contentWindow?.scrollTo(0, activeTab.scroll);
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
        prev.map((t) => (t.id === activeId ? { ...t, muted: next } : t)),
      );
    } else {
      console.warn('Unable to control audio for this site.');

    }
  }, [activeId, activeTab.muted, setIframeMuted]);

  const applyPermissionChange = useCallback(
    (key: PermissionKey, value: boolean) => {
      if (!activeOrigin) return;
      setPermissionStore((prev) => {
        const current = prev[activeOrigin] ?? {};
        const nextOverrides: PermissionOverrides = { ...current };
        if (value === DEFAULT_PERMISSIONS[key]) {
          delete nextOverrides[key];
        } else {
          nextOverrides[key] = value;
        }
        if (Object.keys(nextOverrides).length === 0) {
          const { [activeOrigin]: _omit, ...rest } = prev;
          return rest;
        }
        return { ...prev, [activeOrigin]: nextOverrides };
      });
      if (activeHostname) {
        const label = key === 'scripts' ? 'Scripts' : 'Cookies';
        setPermissionNotice(
          `${label} ${value ? 'enabled' : 'blocked'} for ${activeHostname}`,
        );
      }
      setReloadToken((token) => token + 1);
    },
    [activeHostname, activeOrigin, setPermissionStore],
  );

  const resetPermissions = useCallback(() => {
    if (!activeOrigin) return;
    setPermissionStore((prev) => {
      if (!prev[activeOrigin]) return prev;
      const { [activeOrigin]: _omit, ...rest } = prev;
      return rest;
    });
    if (activeHostname) {
      setPermissionNotice(`Permissions reset for ${activeHostname}`);
    }
    setReloadToken((token) => token + 1);
  }, [activeHostname, activeOrigin, setPermissionStore]);

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
        return newTabs;
      });
      draggingId.current = null;
    },
    [],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

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
      <div className="flex items-center bg-gray-800 text-sm p-1 space-x-1 relative">
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
        <div className="relative">
          <button
            onClick={() => setShowSiteSettings((s) => !s)}
            aria-label="Site permissions"
            className={`px-2 ${canEditPermissions ? '' : 'opacity-50 cursor-not-allowed'}`}
            aria-disabled={canEditPermissions ? undefined : true}
          >
            ⚙
          </button>
          {showSiteSettings && (
            <div className="absolute right-0 z-20 mt-2 w-72 rounded border border-gray-700 bg-gray-900 p-3 text-xs shadow-lg space-y-3">
              {canEditPermissions && activeHostname ? (
                <>
                  <p className="font-semibold text-sm">Site permissions for {activeHostname}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Scripts</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={activePermissions.scripts}
                        aria-label="Scripts"
                        className={`rounded px-2 py-1 ${
                          activePermissions.scripts ? 'bg-green-700' : 'bg-red-700'
                        }`}
                        onClick={() =>
                          applyPermissionChange('scripts', !activePermissions.scripts)
                        }
                      >
                        {activePermissions.scripts ? 'Allowed' : 'Blocked'}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cookies &amp; storage</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={activePermissions.cookies}
                        aria-label="Cookies"
                        className={`rounded px-2 py-1 ${
                          activePermissions.cookies ? 'bg-green-700' : 'bg-red-700'
                        }`}
                        onClick={() =>
                          applyPermissionChange('cookies', !activePermissions.cookies)
                        }
                      >
                        {activePermissions.cookies ? 'Allowed' : 'Blocked'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-gray-300">
                    <p>Active sandbox flags:</p>
                    <p className="text-[11px]">{activeSandboxFlags.join(', ') || '(none)'}</p>
                  </div>
                  <button
                    type="button"
                    className="w-full rounded bg-gray-800 px-2 py-1"
                    onClick={resetPermissions}
                  >
                    Reset to defaults
                  </button>
                  <p className="text-[11px] text-gray-400">
                    Changes reload this tab immediately.
                  </p>
                </>
              ) : (
                <p>Site permissions are available for web pages only.</p>
              )}
            </div>
          )}
        </div>
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
      {permissionNotice && (
        <div className="bg-green-700 px-3 py-1 text-xs" role="status">
          {permissionNotice}
        </div>
      )}
      <div
        className="flex space-x-1 bg-gray-700 text-sm overflow-x-auto"
        ref={tabStripRef}
        tabIndex={0}
        onKeyDown={onTabStripKeyDown}
      >
        {filteredTabs.map((t) => (
          <div
            key={t.id}
            id={`tab-${t.id}`}
            className={`flex items-center px-2 py-1 cursor-pointer ${t.id === activeId ? 'bg-gray-600' : 'bg-gray-700'} `}
            onClick={() => setActiveId(t.id)}
            draggable
            onDragStart={onDragStart(t.id)}
            onDragOver={onDragOver}
            onDrop={onDrop(t.id)}

          >
            {(() => {
              try {
                const origin = new URL(t.url).origin;
                const src = favicons[origin];
                return src ? (
                  <img
                    src={src}
                    alt=""
                    className="w-4 h-4 mr-1 flex-shrink-0"
                  />
                ) : null;
              } catch {
                return null;
              }
            })()}
            <span className="mr-2 truncate" style={{ maxWidth: 100 }}>
              {t.url.replace(/^https?:\/\/(www\.)?/, '')}
            </span>
            {t.muted && <span className="mr-1">🔇</span>}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.id);
                }}
                aria-label="Close Tab"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
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
              key={`${activeTab.id}-${reloadToken}`}
              src={activeTab.url}
              title={activeTab.url}
              className="w-full h-full"
              sandbox={activeSandboxFlags.join(' ')}
              // @ts-ignore - CSP is a valid attribute but not in the React types
              csp={CSP}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture; microphone; camera"
              referrerPolicy="no-referrer"
              allowFullScreen
            />
          )}
          {showFlags && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 space-y-1">
              <p>Active sandbox flags: {activeSandboxFlags.join(', ') || '(none)'}</p>
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
