import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import styles from '../../styles/firefoxMock.module.css';

const HOME_URL = 'https://www.google.com/';

type LoadState = 'idle' | 'loading' | 'success' | 'failed';

type Tab = {
  id: string;
  title: string;
  url: string;
  viewUrl: string;
  history: string[];
  historyIndex: number;
  loadState: LoadState;
  viewKey: number;
  stopRequested: boolean;
};

const deriveTitle = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch (error) {
    return url;
  }
};

const normalizeInput = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hasProtocol = /^https?:\/\//i.test(trimmed);
  const looksLikeDomain = /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:[:/].*)?$/i.test(trimmed);

  if (hasProtocol) {
    try {
      return new URL(trimmed).toString();
    } catch (error) {
      return null;
    }
  }

  if (looksLikeDomain) {
    try {
      return new URL(`https://${trimmed}`).toString();
    } catch (error) {
      return null;
    }
  }

  const encoded = encodeURIComponent(trimmed);
  return `https://www.google.com/search?q=${encoded}`;
};

const createTab = (): Tab => ({
  id: `tab-${Math.random().toString(36).slice(2)}`,
  title: 'New Tab',
  url: HOME_URL,
  viewUrl: HOME_URL,
  history: [HOME_URL],
  historyIndex: 0,
  loadState: 'loading',
  viewKey: Date.now(),
  stopRequested: false,
});

const FirefoxMock = () => {
  const [tabs, setTabs] = useState<Tab[]>([createTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id);
  const [addressValue, setAddressValue] = useState(HOME_URL);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? tabs[0], [tabs, activeTabId]);

  useEffect(() => {
    if (activeTab) {
      setAddressValue(activeTab.url);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [menuOpen]);

  const updateTab = useCallback((id: string, updater: (tab: Tab) => Tab) => {
    setTabs((current) => current.map((tab) => (tab.id === id ? updater(tab) : tab)));
  }, []);

  const navigateTo = useCallback(
    (rawInput: string, tabId: string = activeTabId) => {
      const normalized = normalizeInput(rawInput);
      if (!normalized) return;

      updateTab(tabId, (tab) => {
        const nextHistory = [...tab.history.slice(0, tab.historyIndex + 1), normalized];
        return {
          ...tab,
          url: normalized,
          viewUrl: normalized,
          history: nextHistory,
          historyIndex: nextHistory.length - 1,
          title: deriveTitle(normalized),
          loadState: 'loading',
          viewKey: tab.viewKey + 1,
          stopRequested: false,
        };
      });
      setMenuOpen(false);
    },
    [activeTabId, updateTab],
  );

  const goHome = useCallback(() => navigateTo(HOME_URL), [navigateTo]);

  const goBack = useCallback(() => {
    const tab = activeTab;
    if (!tab || tab.historyIndex === 0) return;
    const targetIndex = tab.historyIndex - 1;
    const targetUrl = tab.history[targetIndex];
    updateTab(tab.id, (current) => ({
      ...current,
      historyIndex: targetIndex,
      url: targetUrl,
      viewUrl: targetUrl,
      loadState: 'loading',
      viewKey: current.viewKey + 1,
      stopRequested: false,
    }));
  }, [activeTab, updateTab]);

  const goForward = useCallback(() => {
    const tab = activeTab;
    if (!tab || tab.historyIndex >= tab.history.length - 1) return;
    const targetIndex = tab.historyIndex + 1;
    const targetUrl = tab.history[targetIndex];
    updateTab(tab.id, (current) => ({
      ...current,
      historyIndex: targetIndex,
      url: targetUrl,
      viewUrl: targetUrl,
      loadState: 'loading',
      viewKey: current.viewKey + 1,
      stopRequested: false,
    }));
  }, [activeTab, updateTab]);

  const reload = useCallback(() => {
    if (!activeTab) return;
    updateTab(activeTab.id, (tab) => ({
      ...tab,
      viewUrl: tab.url,
      loadState: 'loading',
      viewKey: tab.viewKey + 1,
      stopRequested: false,
    }));
  }, [activeTab, updateTab]);

  const stopLoading = useCallback(() => {
    if (!activeTab) return;
    // We cannot truly halt cross-origin loading from the parent page. This toggles the
    // loading overlay off and marks the navigation idle while the iframe continues.
    updateTab(activeTab.id, (tab) => ({
      ...tab,
      loadState: 'idle',
      stopRequested: true,
    }));
  }, [activeTab, updateTab]);

  const onFrameLoad = (tabId: string) => {
    updateTab(tabId, (tab) => ({
      ...tab,
      loadState: tab.stopRequested ? 'idle' : tab.viewUrl === 'about:blank' ? 'idle' : 'success',
      stopRequested: false,
    }));
  };

  const onFrameError = (tabId: string) => {
    updateTab(tabId, (tab) => ({
      ...tab,
      loadState: 'failed',
    }));
  };

  const newTab = useCallback(() => {
    const tab = createTab();
    setTabs((current) => [...current, tab]);
    setActiveTabId(tab.id);
    setAddressValue(tab.url);
    setMenuOpen(false);
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((current) => {
        if (current.length === 1) {
          const freshTab = createTab();
          setActiveTabId(freshTab.id);
          setAddressValue(freshTab.url);
          return [freshTab];
        }

        const filtered = current.filter((tab) => tab.id !== id);
        if (id === activeTabId) {
          const nextActive = filtered[Math.max(0, filtered.length - 1)];
          setActiveTabId(nextActive.id);
          setAddressValue(nextActive.url);
        }
        return filtered;
      });
    },
    [activeTabId],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!document.hasFocus()) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlOrCmd = isMac ? event.metaKey : event.ctrlKey;

      if (ctrlOrCmd && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        const input = containerRef.current?.querySelector<HTMLInputElement>('input[type="text"]');
        input?.focus();
        input?.select();
      }

      if (ctrlOrCmd && event.key.toLowerCase() === 't') {
        event.preventDefault();
        newTab();
      }

      if (ctrlOrCmd && event.key.toLowerCase() === 'w') {
        event.preventDefault();
        closeTab(activeTabId);
      }

      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        goBack();
      }

      if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        goForward();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTabId, closeTab, goBack, goForward, newTab]);

  const currentLoadState: LoadState = activeTab?.loadState ?? 'idle';
  const isLoading = currentLoadState === 'loading';
  const showFallback = currentLoadState === 'failed' && activeTab?.viewUrl !== 'about:blank';

  const bookmarks = [
    { label: 'MDN Docs', url: 'https://developer.mozilla.org/' },
    { label: 'Example', url: 'https://example.com/' },
    { label: 'Wikipedia', url: 'https://www.wikipedia.org/' },
  ];

  const noiseStyle = {
    backgroundImage:
      'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0) 40%), radial-gradient(circle at 20% 20%, rgba(255,255,255,0.06) 0, rgba(255,255,255,0) 30%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.05) 0, rgba(255,255,255,0) 25%)',
  } as const;

  useEffect(() => {
    if (!activeTab || activeTab.loadState !== 'loading') return;
    const timer = window.setTimeout(() => {
      updateTab(activeTab.id, (tab) =>
        tab.loadState === 'loading'
          ? {
              ...tab,
              loadState: 'failed',
            }
          : tab,
      );
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [activeTab, updateTab]);

  return (
    <div className={styles.page} data-theme={theme} ref={containerRef}>
      <Head>
        <title>Firefox-inspired Browser Mock</title>
      </Head>
      <div className={styles.window} style={noiseStyle}>
        <div className={styles.titleBar}>
          <div className={styles.windowControls} aria-label="Window controls">
            <button className={styles.control} aria-label="Minimize" />
            <button className={styles.control} aria-label="Maximize" />
            <button className={`${styles.control} ${styles.close}`} aria-label="Close" />
          </div>
          <div className={styles.title}>Firefox-inspired Mock</div>
          <div className={styles.actions}>
            <div className={styles.menuWrapper} ref={menuRef}>
              <button
                className={styles.menu}
                aria-label="Menu"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
              >
                <span className={styles.menuIcon}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </span>
                <span className={styles.menuLabel}>Menu</span>
              </button>
              {menuOpen && (
                <div className={styles.menuDropdown} role="menu">
                  <button
                    className={styles.menuItem}
                    role="menuitem"
                    onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                  >
                    <span>Switch to {theme === 'dark' ? 'Light' : 'Dark'} theme</span>
                  </button>
                  <button className={styles.menuItem} role="menuitem" onClick={newTab}>
                    New Tab
                  </button>
                  <button className={styles.menuItem} role="menuitem" onClick={goHome}>
                    Go Home
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.tabStrip}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${tab.id === activeTabId ? styles.activeTab : ''}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className={styles.tabGlow} />
              <span className={styles.tabSpinner} aria-hidden="true">
                {tab.loadState === 'loading' && <span className={styles.spinner} />}
              </span>
              <span className={styles.tabTitle}>{tab.title}</span>
              <button
                className={styles.closeTab}
                aria-label="Close tab"
                onClick={(event) => {
                  event.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                ×
              </button>
            </button>
          ))}
          <button className={styles.newTab} onClick={newTab} aria-label="New tab">
            +
          </button>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.navGroup}>
            <button
              className={styles.iconButton}
              onClick={goBack}
              aria-label="Back"
              disabled={!activeTab || activeTab.historyIndex === 0}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              className={styles.iconButton}
              onClick={goForward}
              aria-label="Forward"
              disabled={!activeTab || activeTab.historyIndex >= activeTab.history.length - 1}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <button
              className={styles.iconButton}
              onClick={isLoading ? stopLoading : reload}
              aria-label={isLoading ? 'Stop loading' : 'Reload'}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {isLoading ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M12 4v4l3-3m-3 15v-4l-3 3m9-9h4l-3-3M4 12H0l3 3" />}
              </svg>
            </button>
            <button className={styles.iconButton} onClick={goHome} aria-label="Home">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12l8-7 8 7v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4H10v4a1 1 0 01-1 1H5a1 1 0 01-1-1z" />
              </svg>
            </button>
          </div>

          <div className={styles.addressBar}>
            <svg className={styles.lockIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 11V8a5 5 0 1110 0v3" />
              <rect x="5" y="11" width="14" height="10" rx="2" />
            </svg>
            <input
              type="text"
              value={addressValue}
              onChange={(event) => setAddressValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') navigateTo(addressValue);
              }}
              aria-label="Address bar"
            />
            <button className={styles.starButton} aria-label="Bookmark">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3l2.6 5.4 5.9.9-4.2 4.1 1 5.8L12 16l-5.3 3 1-5.8-4.2-4.1 5.9-.9z" />
              </svg>
            </button>
          </div>

          <div className={styles.utilityGroup}>
            <button
              className={styles.iconButton}
              aria-label="Toggle theme"
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 12a9 9 0 11-9-9 5 5 0 009 9z" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.bookmarks}>
          {bookmarks.map((bookmark) => (
            <button key={bookmark.url} onClick={() => navigateTo(bookmark.url)} className={styles.bookmark}>
              <span className={styles.bookmarkDot} aria-hidden="true" />
              {bookmark.label}
            </button>
          ))}
        </div>

        <div className={styles.contentArea}>
          {showFallback ? (
            <div className={styles.fallback}>
              <div className={styles.fallbackCard}>
                <h2>This site can’t be embedded in an iframe.</h2>
                <p>Some websites restrict being displayed inside other apps. You can still open it in your browser.</p>
                <div className={styles.fallbackActions}>
                  <button
                    className={styles.primary}
                    onClick={() => window.open(activeTab?.url, '_blank', 'noopener')}
                  >
                    Open in new tab
                  </button>
                  <button className={styles.secondary} onClick={goHome}>
                    Go to New Tab page
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.iframeWrap}>
              {isLoading && (
                <div className={styles.loadingOverlay}>
                  <div className={styles.loader} />
                  <p>Loading...</p>
                </div>
              )}
              <iframe
                key={`${activeTab?.id}-${activeTab?.viewKey}`}
                src={activeTab?.viewUrl}
                title={activeTab?.title ?? 'Browser tab'}
                sandbox="allow-forms allow-scripts allow-popups allow-modals allow-downloads allow-pointer-lock"
                onLoad={() => activeTab && onFrameLoad(activeTab.id)}
                onError={() => activeTab && onFrameError(activeTab.id)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FirefoxMock;
