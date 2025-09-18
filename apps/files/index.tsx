'use client';

import React, { useCallback, useRef, useState } from 'react';
import TabbedWindow from '../../components/ui/TabbedWindow';
import type { AppTabDefinition } from '../../types/apps';
import FileExplorer from '../../components/apps/file-explorer';

const FilesApp: React.FC = () => {
  const windowCounterRef = useRef(0);
  const tabCounterRef = useRef(1);

  const makeTab = useCallback((): AppTabDefinition => {
    const id = `files-${Date.now()}-${tabCounterRef.current}`;
    const title = `Window ${tabCounterRef.current}`;
    tabCounterRef.current += 1;
    return {
      id,
      title,
      content: <FileExplorer key={id} />,
    };
  }, []);

  const [windows, setWindows] = useState(() => [
    { id: `files-window-${windowCounterRef.current++}`, initialTabs: [makeTab()] },
  ]);

  const handleDetach = useCallback((tab: AppTabDefinition) => {
    setWindows((prev) => [
      ...prev,
      { id: `files-window-${windowCounterRef.current++}`, initialTabs: [tab] },
    ]);
  }, []);

  const handleTabsChange = useCallback(
    (windowId: string) => (tabs: AppTabDefinition[]) => {
      if (tabs.length > 0) return;
      setWindows((prev) => prev.filter((win) => win.id !== windowId));
    },
    [],
  );

  return (
    <div className="flex h-full w-full flex-col gap-4">
      {windows.map((win) => (
        <TabbedWindow
          key={win.id}
          initialTabs={win.initialTabs}
          onNewTab={makeTab}
          onTabDetached={handleDetach}
          onTabsChange={handleTabsChange(win.id)}
          className="min-h-[400px]"
        />
      ))}
    </div>
  );
};

export default FilesApp;
