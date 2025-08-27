import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import ExternalFrame from '../ExternalFrame';
import { EXTERNAL_FRAME_ALLOWLIST } from '../../external-allowlist';

const HOME_URL = EXTERNAL_FRAME_ALLOWLIST.chrome[0];

// Helper to generate unique IDs for tabs
const uid = () => Math.random().toString(36).slice(2);

export default function Chrome() {
  // Tabs are persisted in localStorage so sessions survive reloads
  const [tabs, setTabs] = useState(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('chrome-tabs');
    if (stored) return JSON.parse(stored);
    const first = { id: uid(), url: HOME_URL, pinned: false, muted: false };
    localStorage.setItem('chrome-tabs', JSON.stringify([first]));
    return [first];
  });
  const [activeTab, setActiveTab] = useState(() => tabs[0]?.id);
  const [url, setUrl] = useState(() => tabs[0]?.url || HOME_URL);
  const [displayUrl, setDisplayUrl] = useState(() => tabs[0]?.url || HOME_URL);

  const [offline, setOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [siteSettings, setSiteSettings] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem('chrome-site-settings') || '{}');
    } catch {
      return {};
    }
  });

  const frameRef = useRef(null);
  const loadingRef = useRef(false);
  const timerRef = useRef();

  const origin = (() => {
    try {
      return new URL(url).origin;
    } catch {
      return '';
    }
  })();
  const settings = siteSettings[origin] || { blockAutoplay: false, wideMode: false };

  // Persist tabs whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chrome-tabs', JSON.stringify(tabs));
    }
  }, [tabs]);

  // Listen for online/offline events
  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // When the active tab changes, update the URL input
  useEffect(() => {
    const tab = tabs.find((t) => t.id === activeTab);
    if (tab) {
      setUrl(tab.url);
      setDisplayUrl(tab.url);
    }
  }, [activeTab, tabs]);

  // Manage loading state + timeout
  useEffect(() => {
    loadingRef.current = true;
    setLoading(true);
    setError('');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (loadingRef.current) {
        setLoading(false);
        setError('Timed out');
      }
    }, 10000);
    return () => clearTimeout(timerRef.current);
  }, [url]);

  const handleFrameLoad = () => {
    loadingRef.current = false;
    setLoading(false);
  };

  // Tab helpers ------------------------------------------------------------
  const updateActiveUrl = (id, newUrl) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, url: newUrl } : t)));
    if (id === activeTab) {
      setUrl(newUrl);
      setDisplayUrl(newUrl);
    }
  };

  const addTab = () => {
    const id = uid();
    setTabs([...tabs, { id, url: HOME_URL, pinned: false, muted: false }]);
    setActiveTab(id);
  };

  const closeTab = (id) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab?.pinned) return; // can't close pinned
    const remaining = tabs.filter((t) => t.id !== id);
    setTabs(remaining);
    if (id === activeTab && remaining.length) {
      setActiveTab(remaining[0].id);
    }
  };

  const pinTab = (id) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)));
  };

  const muteTab = (id) => {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, muted: !t.muted } : t)));
  };

  // URL bar ---------------------------------------------------------------
  const handleKey = (e) => {
    if (e.key === 'Enter') {
      let input = e.target.value.trim();
      if (!input) return;
      if (!input.startsWith('http://') && !input.startsWith('https://')) {
        input = 'https://' + input;
      }
      const display = encodeURI(input);
      updateActiveUrl(activeTab, display);
    }
  };

  const handleDisplayUrl = (e) => setDisplayUrl(e.target.value);

  const reloadFrame = () => {
    loadingRef.current = true;
    setLoading(true);
    setError('');
    try {
      frameRef.current?.contentWindow?.location.reload();
    } catch {
      // ignore cross-origin restrictions
    }
  };

  // Per-site settings -----------------------------------------------------
  const toggleSetting = (name) => {
    const current = siteSettings[origin] || { blockAutoplay: false, wideMode: false };
    const updated = { ...siteSettings, [origin]: { ...current, [name]: !current[name] } };
    setSiteSettings(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('chrome-site-settings', JSON.stringify(updated));
    }
  };

  // Banners ---------------------------------------------------------------
  const offlineBanner = offline ? (
    <div className="bg-red-700 text-white text-sm p-1 flex items-center justify-between" data-testid="offline-banner">
      <span>Offline</span>
      <button onClick={reloadFrame} className="underline">Try again</button>
    </div>
  ) : null;

  const errorBanner = error ? (
    <div className="bg-red-700 text-white text-sm p-1" data-testid="error-banner">{error}</div>
  ) : null;

  const loader = loading ? (
    <div className="absolute inset-0 flex items-center justify-center bg-ub-cool-grey text-white" data-testid="loader">
      Loading...
    </div>
  ) : null;

  // Render ---------------------------------------------------------------
  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey relative">
      {offlineBanner}
      {errorBanner}
      {!focusMode && (
        <div className="flex bg-ub-grey text-white text-sm overflow-x-auto" data-testid="tab-strip">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`px-2 py-1 flex items-center gap-1 ${
                tab.id === activeTab ? 'bg-ub-cool-grey' : ''
              }`}
            >
              <button
                onClick={() => setActiveTab(tab.id)}
                className="truncate max-w-[100px]"
                data-testid="tab"
              >
                {tab.url}
              </button>
              <button onClick={() => pinTab(tab.id)}>{tab.pinned ? '📌' : '📍'}</button>
              <button onClick={() => muteTab(tab.id)}>{tab.muted ? '🔇' : '🔈'}</button>
              {!tab.pinned && (
                <button onClick={() => closeTab(tab.id)} data-testid="close-tab">
                  x
                </button>
              )}
            </div>
          ))}
          <button onClick={addTab} data-testid="add-tab" className="px-2">
            +
          </button>
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="ml-auto px-2"
            data-testid="focus-toggle"
          >
            {focusMode ? '📥' : '🕶️'}
          </button>
        </div>
      )}
      <div className="w-full pt-0.5 pb-1 flex justify-start items-center text-white text-sm border-b border-gray-900">
        <div
          onClick={reloadFrame}
          className=" ml-2 mr-1 flex justify-center items-center rounded-full bg-gray-50 bg-opacity-0 hover:bg-opacity-10"
        >
          <Image
            className="w-5"
            src="/themes/Yaru/status/chrome_refresh.svg"
            alt="Ubuntu Chrome Refresh"
            width={20}
            height={20}
            sizes="20px"
          />
        </div>
        <div
          onClick={() => updateActiveUrl(activeTab, HOME_URL)}
          className=" mr-2 ml-1 flex justify-center items-center rounded-full bg-gray-50 bg-opacity-0 hover:bg-opacity-10"
        >
          <Image
            className="w-5"
            src="/themes/Yaru/status/chrome_home.svg"
            alt="Ubuntu Chrome Home"
            width={20}
            height={20}
            sizes="20px"
          />
        </div>
        <input
          onKeyDown={handleKey}
          onChange={handleDisplayUrl}
          value={displayUrl}
          className="outline-none bg-ub-grey rounded-full pl-3 py-0.5 mr-3 w-5/6 text-gray-300 focus:text-white"
          type="url"
          spellCheck={false}
          autoComplete="off"
        />
        <div className="flex items-center gap-2 text-xs ml-2">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.blockAutoplay}
              onChange={() => toggleSetting('blockAutoplay')}
            />
            Block autoplay
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={settings.wideMode}
              onChange={() => toggleSetting('wideMode')}
            />
            Wide mode
          </label>
        </div>
      </div>
      <div className={`flex-1 relative ${settings.wideMode ? 'w-full' : ''}`}>
        <ExternalFrame
          ref={frameRef}
          app="chrome"
          src={url}
          className="h-full w-full flex-grow"
          title="Ubuntu Chrome Url"
          onLoad={handleFrameLoad}
          allow={settings.blockAutoplay ? undefined : 'autoplay'}
        />
        {loader}
      </div>
    </div>
  );
}

export const displayChrome = () => <Chrome />;
