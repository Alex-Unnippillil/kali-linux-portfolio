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
import AddressBar from '../chrome/AddressBar';

interface TabData {
  id: number;
  url: string;
  history: string[];
  historyIndex: number;
  scroll: number;
  blocked?: boolean;
  muted?: boolean;
}

interface Bookmark {
  url: string;
  title: string;
  favicon: string;
}

const STORAGE_KEY_PREFIX = 'chrome-tabs-';
const BOOKMARK_KEY = 'chrome-bookmarks';
const FAVICON_KEY = 'chrome-favicons';
const LAST_URL_KEY = 'chrome-last-url';
const HOME_URL = 'https://www.google.com/webhp?igu=1';
const SANDBOX_FLAGS = ['allow-scripts', 'allow-forms', 'allow-popups'] as const;
const CSP = "default-src 'self'; script-src 'none'; connect-src 'none';";

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

const readTabs = (id: string): { tabs: TabData[]; active: number } => {
  if (typeof window === 'undefined') return { tabs: [], active: 0 };
  try {
    const data = JSON.parse(
      localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`) || '',
    );
    return data || { tabs: [], active: 0 };
  } catch {
    return { tabs: [], active: 0 };
  }
};

const saveTabs = (id: string, tabs: TabData[], active: number) => {
  localStorage.setItem(
    `${STORAGE_KEY_PREFIX}${id}`,
    JSON.stringify({ tabs, active }),
  );
  const last = tabs.find((t) => t.id === active)?.url;
  if (last) {
    const map = JSON.parse(localStorage.getItem(LAST_URL_KEY) || '{}');
    map[id] = last;
    localStorage.setItem(LAST_URL_KEY, JSON.stringify(map));
  }
};

const loadLastUrl = (id: string): string => {
  if (typeof window === 'undefined') return '';
  try {
    const map = JSON.parse(localStorage.getItem(LAST_URL_KEY) || '{}');
    return map[id] || '';
  } catch {
    return '';
  }
};

const readBookmarks = (): Bookmark[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(BOOKMARK_KEY);
    return data ? (JSON.parse(data) as Bookmark[]) : [];
  } catch {
    return [];
  }
};

const saveBookmarks = (items: Bookmark[]) => {
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(items));
};

const getFavicon = (url: string): string => {
  try {
    const origin = new URL(url).origin;
    const cache = JSON.parse(localStorage.getItem(FAVICON_KEY) || '{}');
    if (cache[origin]) return cache[origin];
    const fav = `https://www.google.com/s2/favicons?domain=${origin}`;
    cache[origin] = fav;
    localStorage.setItem(FAVICON_KEY, JSON.stringify(cache));
    return fav;
  } catch {
    return '';
  }
};

const Chrome: React.FC<{ initialUrl?: string }> = ({ initialUrl }) => {
  const windowIdRef = useRef('');
  if (typeof window !== 'undefined') {
    if (!window.name) {
      window.name = `chrome-${Date.now()}`;
    }
    windowIdRef.current = window.name;
  }
  const { tabs: storedTabs, active: storedActive } = readTabs(windowIdRef.current);
  const lastUrl = loadLastUrl(windowIdRef.current);
  const startUrl = initialUrl || lastUrl || HOME_URL;
  const [tabs, setTabs] = useState<TabData[]>(
    storedTabs.length
      ? storedTabs.map((t) => ({ blocked: false, muted: false, ...t }))
      : [
          {
            id: Date.now(),
            url: startUrl,
            history: [startUrl],
            historyIndex: 0,
            scroll: 0,
            blocked: false,
            muted: false,
          },
        ]
  );
  const [activeId, setActiveId] = useState<number>(storedActive || tabs[0].id);
  const [address, setAddress] = useState<string>(
    tabs.find((t) => t.id === activeId)?.url || startUrl,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [showFlags, setShowFlags] = useState(false);
  const dragTabId = useRef<number | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(readBookmarks);
  const importRef = useRef<HTMLInputElement | null>(null);
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

  useEffect(() => {
    saveTabs(windowIdRef.current, tabs, activeId);
  }, [tabs, activeId]);

  const activeTab = tabs.find((t) => t.id === activeId)!;

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

  const navigate = useCallback(async (raw: string) => {
    const url = formatUrl(raw);
    let blocked = false;
    try {
      const res = await fetch(url, { method: 'HEAD', mode: 'cors' });
      const xfo = res.headers.get('x-frame-options');
      const csp = res.headers.get('content-security-policy');
      if (xfo || (csp && /frame-ancestors|frame-src|child-src/.test(csp))) blocked = true;
    } catch {
      blocked = true;
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
          : t
      )
    );
    setAddress(url);
    fetchArticle(activeId, url);
  }, [activeId, fetchArticle]);

  const addTab = useCallback((url?: string) => {
    const target = url || HOME_URL;
    const id = Date.now();
    setTabs((prev) => [
      ...prev,
      {
        id,
        url: target,
        history: [target],
        historyIndex: 0,
        scroll: 0,
        blocked: false,
        muted: false,
      },
    ]);
    setActiveId(id);
    setAddress(target);
  }, []);

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

  const [menu, setMenu] = useState<
    { x: number; y: number; url: string } | null
  >(null);

  const handleTabContext = useCallback(
    (id: number) => (e: React.MouseEvent) => {
      e.preventDefault();
      const t = tabs.find((tab) => tab.id === id);
      if (t) setMenu({ x: e.clientX, y: e.clientY, url: t.url });
    },
    [tabs],
  );

  const openInNewTab = useCallback(
    (url: string) => {
      addTab(url);
    },
    [addTab],
  );

  const openInNewWindow = useCallback((url: string) => {
    const u = `/apps/chrome?url=${encodeURIComponent(url)}`;
    window.open(u, '_blank', 'noopener');
  }, []);

  const toggleBookmark = useCallback(() => {
    const url = activeTab.url;
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.url === url);
      let next: Bookmark[];
      if (exists) {
        next = prev.filter((b) => b.url !== url);
      } else {
        next = [...prev, { url, title: url, favicon: getFavicon(url) }];
      }
      saveBookmarks(next);
      return next;
    });
  }, [activeTab.url]);

  const exportBookmarks = useCallback(() => {
    const blob = new Blob([JSON.stringify(bookmarks, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bookmarks.json';
    a.click();
  }, [bookmarks]);

  const importBookmarks = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as Bookmark[];
          setBookmarks(data);
          saveBookmarks(data);
        } catch {
          /* ignore */
        }
      };
      reader.readAsText(file);
    },
    [],
  );

  const bookmarked = bookmarks.some((b) => b.url === activeTab.url);

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
    if (!articles[activeId]) {
      fetchArticle(activeId, activeTab.url);
    }
    if (!setIframeMuted(!!activeTab.muted) && activeTab.muted) {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, muted: false } : t)),
      );

    }
  }, [activeId, activeTab.url, activeTab.muted, articles, fetchArticle, setIframeMuted]);

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
    <div
      className="flex flex-col w-full h-full bg-ub-cool-grey text-white relative"
      onClick={() => setMenu(null)}
    >
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
        <button
          onClick={toggleBookmark}
          aria-label="Bookmark"
          className="px-2"
        >
          {bookmarked ? '★' : '☆'}
        </button>
        <button
          onClick={exportBookmarks}
          aria-label="Export Bookmarks"
          className="px-2"
        >
          ⭳
        </button>
        <button
          onClick={() => importRef.current?.click()}
          aria-label="Import Bookmarks"
          className="px-2"
        >
          ⭱
        </button>
        <input
          type="file"
          accept="application/json"
          ref={importRef}
          className="hidden"
          onChange={importBookmarks}
        />
        <AddressBar value={address} onChange={setAddress} onNavigate={navigate} />
        <button onClick={() => addTab()} aria-label="New Tab" className="px-2">
          +
        </button>
      </div>
      <div className="flex space-x-1 bg-gray-700 text-sm overflow-x-auto">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`flex items-center px-2 py-1 cursor-pointer ${
              t.id === activeId ? 'bg-gray-600' : 'bg-gray-700'
            } `}
            onClick={() => setActiveId(t.id)}
            onContextMenu={handleTabContext(t.id)}
            draggable
            onDragStart={handleDragStart(t.id)}
            onDragOver={allowDrop}
            onDrop={handleDrop(t.id)}
          >
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
      {menu && (
        <div
          className="absolute z-50 bg-gray-800 text-white text-sm rounded shadow"
          style={{ top: menu.y, left: menu.x }}
        >
          <button
            onClick={() => openInNewTab(menu.url)}
            className="block w-full text-left px-2 py-1 hover:bg-gray-700"
          >
            Open in New Tab
          </button>
          <button
            onClick={() => openInNewWindow(menu.url)}
            className="block w-full text-left px-2 py-1 hover:bg-gray-700"
          >
            Open in New Window
          </button>
        </div>
      )}
        <div className="flex-grow bg-white relative overflow-auto">
          {articles[activeId] ? (
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
              csp={CSP}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture; microphone; camera"
              referrerPolicy="no-referrer"
              allowFullScreen
            />
          )}
          {showFlags && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-2 space-y-1">
              <p>Active sandbox flags: {SANDBOX_FLAGS.join(', ') || '(none)'}</p>
              <p>Note: combining <code>allow-scripts</code> with <code>allow-same-origin</code> defeats isolation.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

export default Chrome;
export const displayChrome = () => <Chrome />;
