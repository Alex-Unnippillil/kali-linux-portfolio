import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';

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
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
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
    storedTabs.length ? storedTabs : [{ id: Date.now(), url: HOME_URL, history: [HOME_URL], historyIndex: 0, scroll: 0 }]
  );
  const [activeId, setActiveId] = useState<number>(storedActive || tabs[0].id);
  const [address, setAddress] = useState<string>(tabs.find((t) => t.id === activeId)?.url || HOME_URL);
  const [searchTerm, setSearchTerm] = useState('');
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    saveTabs(tabs, activeId);
  }, [tabs, activeId]);

  const activeTab = tabs.find((t) => t.id === activeId)!;

  const navigate = async (raw: string) => {
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
  };

  const onAddressKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') navigate(address);
  };

  const addTab = () => {
    const id = Date.now();
    setTabs((prev) => [...prev, { id, url: HOME_URL, history: [HOME_URL], historyIndex: 0, scroll: 0 }]);
    setActiveId(id);
    setAddress(HOME_URL);
  };

  const closeTab = (id: number) => {
    setTabs((prev) => prev.filter((t) => t.id !== id));
    if (id === activeId && tabs.length > 1) {
      const idx = tabs.findIndex((t) => t.id === id);
      const next = tabs[idx - 1] || tabs[idx + 1];
      setActiveId(next.id);
      setAddress(next.url);
    }
  };

  const reload = () => {
    iframeRef.current?.contentWindow?.location.reload();
  };

  const stop = () => {
    iframeRef.current?.contentWindow?.stop();
  };

  const goBack = () => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeId && t.historyIndex > 0
          ? { ...t, historyIndex: t.historyIndex - 1, url: t.history[t.historyIndex - 1] }
          : t
      )
    );
  };

  const goForward = () => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeId && t.historyIndex < t.history.length - 1
          ? { ...t, historyIndex: t.historyIndex + 1, url: t.history[t.historyIndex + 1] }
          : t
      )
    );
  };

  useEffect(() => {
    setAddress(activeTab.url);
  }, [activeTab.url]);

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
  }, [activeTab.id]);

  const doFind = () => {
    try {
      iframeRef.current?.contentWindow?.find(searchTerm);
    } catch {
      /* ignore */
    }
  };

  const toggleMute = () => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, muted: !t.muted } : t))
    );
    try {
      // @ts-ignore
      iframeRef.current.muted = !activeTab.muted;
    } catch {
      /* ignore */
    }
  };

  const screenshot = async () => {
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
  };

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
      <div className="flex-grow bg-white relative">
        {activeTab.blocked ? (
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
