import React, { useEffect, useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { Readability } from '@mozilla/readability';

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
const HOME_URL = 'https://www.google.com/webhp?igu=1';

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
  const [tabs, setTabs] = useState<TabData[]>(
    storedTabs.length
      ? storedTabs.map((t) => ({ blocked: false, muted: false, ...t }))
      : [
          {
            id: Date.now(),
            url: HOME_URL,
            history: [HOME_URL],
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
  const [articles, setArticles] = useState<Record<number, string>>({});

  useEffect(() => {
    saveTabs(tabs, activeId);
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

  const onAddressKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') navigate(address);
    },
    [address, navigate],
  );

  const addTab = useCallback(() => {
    const id = Date.now();
    setTabs((prev) => [
      ...prev,
      {
        id,
        url: HOME_URL,
        history: [HOME_URL],
        historyIndex: 0,
        scroll: 0,
        blocked: false,
        muted: false,
      },
    ]);
    setActiveId(id);
    setAddress(HOME_URL);
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
    try {
      // @ts-ignore
      if (iframeRef.current) iframeRef.current.muted = !!activeTab.muted;
    } catch {
      /* ignore */
    }
  }, [activeId, activeTab.url, activeTab.muted, articles, fetchArticle]);

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
      const win = iframeRef.current?.contentWindow as any;
      win?.find(searchTerm);
    } catch {
      /* ignore */
    }
  }, [searchTerm]);

  const toggleMute = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, muted: !t.muted } : t)),
    );
    try {
      // @ts-ignore
      iframeRef.current.muted = !activeTab.muted;
    } catch {
      /* ignore */
    }
  }, [activeId, activeTab.muted]);

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
      <p className="mb-2">This site refused to connect.</p>
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
        <input
          className="flex-grow px-2 py-0.5 text-black rounded"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={onAddressKey}
          spellCheck={false}
        />
        <button onClick={addTab} aria-label="New Tab" className="px-2">+</button>
      </div>
      <div className="flex space-x-1 bg-gray-700 text-sm overflow-x-auto">
        {tabs.map((t) => (
          <div
            key={t.id}
            className={`flex items-center px-2 py-1 cursor-pointer ${t.id === activeId ? 'bg-gray-600' : 'bg-gray-700'} `}
            onClick={() => setActiveId(t.id)}
          >
            <span className="mr-2 truncate" style={{ maxWidth: 100 }}>
              {t.url.replace(/^https?:\/\/(www\.)?/, '')}
            </span>
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
      <div className="flex items-center bg-gray-800 text-sm p-1 space-x-1">
        <input
          placeholder="Find in page"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doFind()}
          className="px-2 py-0.5 text-black rounded flex-grow"
        />
        <button onClick={doFind} className="px-2">
          Find
        </button>
        <button onClick={toggleMute} className="px-2" aria-label="Mute">
          {activeTab.muted ? 'Unmute' : 'Mute'}
        </button>
        <button onClick={screenshot} className="px-2" aria-label="Screenshot">
          📷
        </button>
      </div>
      <div className="flex-grow bg-white relative overflow-auto">
        {articles[activeId] ? (
          <main
            style={{ maxInlineSize: '60ch', margin: 'auto' }}
            dangerouslySetInnerHTML={{ __html: articles[activeId] }}
          />
        ) : activeTab.blocked ? (
          blockedView
        ) : (
          <iframe
            ref={iframeRef}
            src={activeTab.url}
            title={activeTab.url}
            className="w-full h-full"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; geolocation; gyroscope; picture-in-picture; microphone; camera"
            referrerPolicy="no-referrer"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
};

export default Chrome;
export const displayChrome = () => <Chrome />;
