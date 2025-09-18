import React, { useCallback, useEffect, useRef, useState, createContext, useContext } from 'react';
import clsx from 'clsx';
import styles from './TabbedWindow.module.css';

function middleEllipsis(text: string, max = 30) {
  if (text.length <= max) return text;
  const half = Math.floor((max - 1) / 2);
  return `${text.slice(0, half)}…${text.slice(text.length - half)}`;
}

export interface TabDefinition {
  id: string;
  title: string;
  content: React.ReactNode;
  closable?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
  onClose?: () => void;
}

interface TabbedWindowProps {
  initialTabs: TabDefinition[];
  onNewTab?: () => TabDefinition;
  onTabsChange?: (tabs: TabDefinition[]) => void;
  className?: string;
}

interface TabContextValue {
  id: string;
  active: boolean;
  close: () => void;
}

const TabContext = createContext<TabContextValue>({ id: '', active: false, close: () => {} });
export const useTab = () => useContext(TabContext);

const TabbedWindow: React.FC<TabbedWindowProps> = ({
  initialTabs,
  onNewTab,
  onTabsChange,
  className = '',
}) => {
  const [tabs, setTabs] = useState<TabDefinition[]>(initialTabs);
  const [activeId, setActiveId] = useState<string>(initialTabs[0]?.id || '');
  const prevActive = useRef<string>('');
  const dragSrc = useRef<number | null>(null);

  useEffect(() => {
    if (prevActive.current !== activeId) {
      const prev = tabs.find((t) => t.id === prevActive.current);
      const next = tabs.find((t) => t.id === activeId);
      if (prev && prev.onDeactivate) prev.onDeactivate();
      if (next && next.onActivate) next.onActivate();
      prevActive.current = activeId;
    }
  }, [activeId, tabs]);

  const updateTabs = useCallback(
    (updater: (prev: TabDefinition[]) => TabDefinition[]) => {
      setTabs((prev) => {
        const next = updater(prev);
        onTabsChange?.(next);
        return next;
      });
    },
    [onTabsChange],
  );

  const setActive = useCallback(
    (id: string) => {
      setActiveId(id);
    },
    [],
  );

  const closeTab = useCallback(
    (id: string) => {
      updateTabs((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        const removed = prev[idx];
        const next = prev.filter((t) => t.id !== id);
        if (removed && removed.onClose) removed.onClose();
        if (id === activeId && next.length > 0) {
          const fallback = next[idx] || next[idx - 1];
          setActiveId(fallback.id);
        } else if (next.length === 0 && onNewTab) {
          const tab = onNewTab();
          next.push(tab);
          setActiveId(tab.id);
        }
        return next;
      });
    },
    [activeId, onNewTab, updateTabs],
  );

  const addTab = useCallback(() => {
    if (!onNewTab) return;
    const tab = onNewTab();
    updateTabs((prev) => [...prev, tab]);
    setActiveId(tab.id);
  }, [onNewTab, updateTabs]);

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragSrc.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const src = dragSrc.current;
    if (src === null || src === index) return;
    updateTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(src, 1);
      next.splice(index, 0, moved);
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'w') {
      e.preventDefault();
      closeTab(activeId);
      return;
    }
    if (e.ctrlKey && e.key.toLowerCase() === 't') {
      e.preventDefault();
      addTab();
      return;
    }
    if (e.ctrlKey && e.key === 'Tab') {
      e.preventDefault();
      setTabs((prev) => {
        if (prev.length === 0) return prev;
        const idx = prev.findIndex((t) => t.id === activeId);
        const nextIdx = e.shiftKey
          ? (idx - 1 + prev.length) % prev.length
          : (idx + 1) % prev.length;
        const nextTab = prev[nextIdx];
        setActiveId(nextTab.id);
        return prev;
      });
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setTabs((prev) => {
        if (prev.length === 0) return prev;
        const idx = prev.findIndex((t) => t.id === activeId);
        const nextIdx =
          e.key === 'ArrowLeft'
            ? (idx - 1 + prev.length) % prev.length
            : (idx + 1) % prev.length;
        const nextTab = prev[nextIdx];
        setActiveId(nextTab.id);
        return prev;
      });
    }
  };

  const tabBarStyle: React.CSSProperties = {
    '--tab-bar-gap': 'var(--space-2)',
    '--tab-bar-padding-inline': 'calc(var(--space-2) * 2)',
    '--tab-bar-padding-inline-sm': 'var(--space-2)',
    '--tab-bar-padding-block': 'var(--space-2)',
    '--tab-gap': 'var(--space-2)',
    '--tab-height': 'var(--hit-area)',
    '--tab-radius': 'var(--radius-lg)',
    '--tab-padding-inline': 'calc(var(--space-2) * 2)',
    '--tab-padding-inline-sm': 'var(--space-2)',
    '--tab-close-size': 'calc(var(--hit-area) / 2)',
    '--new-tab-size': 'var(--hit-area)',
  };

  return (
    <div
      className={clsx(styles.container, className)}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div
        className={styles.tabBar}
        role="tablist"
        aria-label="Window tabs"
        style={tabBarStyle}
      >
        <div className={styles.tabsScroll}>
          {tabs.map((t, i) => {
            const tabId = `tab-${t.id}`;
            const panelId = `tabpanel-${t.id}`;
            return (
              <div
                key={t.id}
                id={tabId}
                className={clsx(styles.tab, t.id === activeId && styles.tabActive)}
                role="tab"
                aria-selected={t.id === activeId}
                aria-controls={panelId}
                tabIndex={t.id === activeId ? 0 : -1}
                draggable
                onDragStart={handleDragStart(i)}
                onDragOver={handleDragOver(i)}
                onDrop={handleDrop(i)}
                onClick={() => setActive(t.id)}
              >
                <span className={styles.tabLabel}>{middleEllipsis(t.title)}</span>
                {t.closable !== false && tabs.length > 1 && (
                  <button
                    type="button"
                    className={styles.tabCloseButton}
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
            );
          })}
        </div>
        {onNewTab && (
          <button
            type="button"
            className={styles.newTabButton}
            onClick={addTab}
            aria-label="New Tab"
          >
            +
          </button>
        )}
      </div>
      <div className={styles.panelContainer}>
        {tabs.map((t) => {
          const tabId = `tab-${t.id}`;
          const panelId = `tabpanel-${t.id}`;
          return (
            <TabContext.Provider
              key={t.id}
              value={{ id: t.id, active: t.id === activeId, close: () => closeTab(t.id) }}
            >
              <div
                id={panelId}
                role="tabpanel"
                aria-labelledby={tabId}
                className={clsx(
                  styles.panel,
                  t.id === activeId ? undefined : styles.panelHidden,
                )}
              >
                {t.content}
              </div>
            </TabContext.Provider>
          );
        })}
      </div>
    </div>
  );
};

export default TabbedWindow;
