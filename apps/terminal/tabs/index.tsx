'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../../components/ui/TabbedWindow';
import Terminal from '..';
import { createSession, destroySession, updateSessionTitle } from '../state';

interface TerminalWindowState {
  id: string;
  tabs: TabDefinition[];
}

const createWindowId = (() => {
  let counter = 1;
  return () => `terminal-window-${counter++}`;
})();

const createTabId = (sessionId: string) => `terminal-tab-${sessionId}`;

const TerminalTabs: React.FC<{ openApp?: (id: string) => void }> = ({ openApp }) => {
  const countRef = useRef(1);
  const [orientation, setOrientation] = useState<'row' | 'column'>('row');
  const [windows, setWindows] = useState<TerminalWindowState[]>([]);

  const renameTab = useCallback((sessionId: string, title: string) => {
    updateSessionTitle(sessionId, title);
    setWindows((prev) =>
      prev.map((win) => ({
        ...win,
        tabs: win.tabs.map((tab) =>
          tab.data?.sessionId === sessionId ? { ...tab, title } : tab,
        ),
      })),
    );
  }, []);

  const detachSession = useCallback((sessionId: string) => {
    setOrientation('row');
    setWindows((prev) => {
      let moved: TabDefinition | undefined;
      const remaining = prev
        .map((win) => {
          const idx = win.tabs.findIndex((tab) => tab.data?.sessionId === sessionId);
          if (idx !== -1) {
            const nextTabs = [...win.tabs];
            [moved] = nextTabs.splice(idx, 1);
            return { ...win, tabs: nextTabs };
          }
          return win;
        })
        .filter((win) => win.tabs.length > 0);
      if (!moved) return prev;
      return [...remaining, { id: createWindowId(), tabs: [moved] }];
    });
  }, []);

  const handleSplit = useCallback(
    (sessionId: string, direction: 'horizontal' | 'vertical') => {
      const session = createSession();
      const title = `Session ${countRef.current++}`;
      updateSessionTitle(session.id, title);
      const newTab: TabDefinition = {
        id: createTabId(session.id),
        title,
        data: { sessionId: session.id },
        content: (
          <Terminal
            key={session.id}
            sessionId={session.id}
            openApp={openApp}
            onSplit={(nextDirection) => handleSplit(session.id, nextDirection)}
            onDetach={() => detachSession(session.id)}
            onRename={(newTitle) => renameTab(session.id, newTitle)}
          />
        ),
        onClose: () => destroySession(session.id),
      };
      setOrientation(direction === 'vertical' ? 'column' : 'row');
      setWindows((prev) => {
        let inserted = false;
        const next = prev.map((win) => {
          if (win.tabs.some((tab) => tab.data?.sessionId === sessionId)) {
            inserted = true;
            return { ...win, tabs: [...win.tabs, newTab] };
          }
          return win;
        });
        if (!inserted) {
          next.push({ id: createWindowId(), tabs: [newTab] });
        }
        return next;
      });
    },
    [detachSession, openApp, renameTab],
  );

  const createTab = useCallback((): TabDefinition => {
    const session = createSession();
    const title = `Session ${countRef.current++}`;
    updateSessionTitle(session.id, title);
    return {
      id: createTabId(session.id),
      title,
      data: { sessionId: session.id },
      content: (
        <Terminal
          key={session.id}
          sessionId={session.id}
          openApp={openApp}
          onSplit={(direction) => handleSplit(session.id, direction)}
          onDetach={() => detachSession(session.id)}
          onRename={(newTitle) => renameTab(session.id, newTitle)}
        />
      ),
      onClose: () => destroySession(session.id),
    };
  }, [detachSession, handleSplit, openApp, renameTab]);

  useEffect(() => {
    if (windows.length === 0) {
      const tab = createTab();
      setWindows([{ id: createWindowId(), tabs: [tab] }]);
    }
  }, [createTab, windows.length]);

  const addTab = useCallback(
    (windowId: string) => {
      const tab = createTab();
      setWindows((prev) =>
        prev.map((win) =>
          win.id === windowId ? { ...win, tabs: [...win.tabs, tab] } : win,
        ),
      );
      return tab;
    },
    [createTab],
  );

  const handleTabsChange = useCallback(
    (windowId: string, nextTabs: TabDefinition[]) => {
      setWindows((prev) => {
        const updated = prev
          .map((win) => (win.id === windowId ? { ...win, tabs: nextTabs } : win))
          .filter((win) => win.tabs.length > 0);
        if (updated.length === 0) {
          const tab = createTab();
          return [{ id: createWindowId(), tabs: [tab] }];
        }
        return updated;
      });
    },
    [createTab],
  );

  const detachTab = useCallback(
    (windowId: string, tab: TabDefinition) => {
      setOrientation('row');
      setWindows((prev) => {
        const next = prev
          .map((win) =>
            win.id === windowId
              ? { ...win, tabs: win.tabs.filter((t) => t.id !== tab.id) }
              : win,
          )
          .filter((win) => win.tabs.length > 0);
        return [...next, { id: createWindowId(), tabs: [tab] }];
      });
    },
    [],
  );

  const createSplitWindow = useCallback(
    (direction: 'horizontal' | 'vertical') => {
      const tab = createTab();
      setOrientation(direction === 'vertical' ? 'column' : 'row');
      setWindows((prev) => [...prev, { id: createWindowId(), tabs: [tab] }]);
    },
    [createTab],
  );

  if (windows.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center gap-2 bg-gray-900 text-white text-xs px-2 py-1">
        <button
          className="px-2 py-1 bg-gray-800 rounded"
          onClick={() => createSplitWindow('horizontal')}
          aria-label="Add split to the right"
        >
          Split Right
        </button>
        <button
          className="px-2 py-1 bg-gray-800 rounded"
          onClick={() => createSplitWindow('vertical')}
          aria-label="Add split below"
        >
          Split Down
        </button>
      </div>
      <div
        className={`flex flex-1 gap-2 overflow-hidden ${
          orientation === 'column' ? 'flex-col' : 'flex-row'
        }`}
      >
        {windows.map((win) => (
        <div
            key={win.id}
            data-testid={`terminal-window-${win.id}`}
            className="flex-1 min-w-0 bg-gray-900/40 border border-gray-700 rounded overflow-hidden"
          >
            <TabbedWindow
              className="h-full"
              initialTabs={win.tabs}
              tabs={win.tabs}
              onNewTab={() => addTab(win.id)}
              onTabsChange={(tabs) => handleTabsChange(win.id, tabs)}
              onDetachTab={(tab) => detachTab(win.id, tab)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default TerminalTabs;
