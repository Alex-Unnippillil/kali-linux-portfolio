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
import TabBar from '../../ui/TabBar';

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

  useEffect(() => {
    setTabs((prev) =>
      prev.map((t) => ({ ...t, blocked: t.blocked || !isAllowed(t.url) })),
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

  const handleSelectTab = useCallback(
    (id: string | number) => {
      const numericId = Number(id);
      const next = tabs.find((t) => t.id === numericId);
      if (!next) return;
      setActiveId(next.id);
      setAddress(next.url);
    },
    [tabs],
  );

  const handleReorderTabs = useCallback((sourceId: string | number, targetId: string | number) => {
    const fromId = Number(sourceId);
    const toId = Number(targetId);
    if (Number.isNaN(fromId) || Number.isNaN(toId)) return;
    setTabs((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === fromId);
      const toIdx = prev.findIndex((t) => t.id === toId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      const nextTabs = [...prev];
      const [moved] = nextTabs.splice(fromIdx, 1);
      nextTabs.splice(toIdx, 0, moved);
      return nextTabs;
    });
  }, []);

  const handleTabBarKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Delete') {
        if (tabs.length > 1) {
          event.preventDefault();
          closeTab(activeId);
        }
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        tabSearchRef.current?.focus();
      }
    },
    [activeId, closeTab, tabs.length],
  );

  const tabItems = useMemo(
    () =>
      filteredTabs.map((t) => {
        let icon: React.ReactNode | undefined;
        try {
          const origin = new URL(t.url).origin;
          const src = favicons[origin];
          if (src) {
            icon = <img src={src} alt="" className="h-4 w-4" />;
          }
        } catch {
          /* ignore */
        }
        const display = t.url.replace(/^https?:\/\/(www\.)?/, '');
        return {
          id: t.id,
          label: <span className="max-w-[160px] truncate">{display}</span>,
          icon,
          meta: t.muted ? (
            <span className="text-xs" role="img" aria-label="Muted">
              🔇
            </span>
          ) : undefined,
          closable: tabs.length > 1,
          closeLabel: `Close ${display || 'tab'}`,
          title: t.url,
        };
      }),
    [filteredTabs, favicons, tabs.length],
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
      <TabBar
        ref={tabStripRef}
        tabs={tabItems}
        activeId={activeId}
        onSelect={handleSelectTab}
        onClose={(id) => closeTab(Number(id))}
        onReorder={handleReorderTabs}
        onKeyDown={handleTabBarKeyDown}
        ariaLabel="Browser tabs"
        className="w-full bg-gray-700"
      />
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
              src={activeTab.url}
              title={activeTab.url}
              className="w-full h-full"
              sandbox={SANDBOX_FLAGS.join(' ')}
              // @ts-ignore - CSP is a valid attribute but not in the React types
              csp={CSP}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture; microphone; camera"
              referrerPolicy="no-referrer"
              allowFullScreen
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
