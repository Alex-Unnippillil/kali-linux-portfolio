'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import TabbedWindow, { TabDefinition } from '../../../components/ui/TabbedWindow';
import Terminal from '..';
import createTerminalSessionManager, {
  type TerminalTabSnapshot,
} from '../../../modules/terminal/sessionStore';
import { getTerminalSettings } from '../../../utils/settings/terminal';

interface TerminalTabsProps {
  openApp?: (id: string) => void;
  profileId?: string;
}

const TerminalTabs: React.FC<TerminalTabsProps> = ({
  openApp,
  profileId = 'default',
}) => {
  const settings = useMemo(() => getTerminalSettings(profileId), [profileId]);
  const persistenceEnabled = settings.persistSessions;
  const fallbackCountRef = useRef(1);
  const createEphemeralTab = useCallback((): TabDefinition => {
    const id = `session-${Date.now().toString(36)}-${fallbackCountRef.current}`;
    const title = `Session ${fallbackCountRef.current++}`;
    return {
      id,
      title,
      content: <Terminal key={id} openApp={openApp} />,
    };
  }, [openApp]);
  const [fallbackInitialTab] = useState<TabDefinition>(() => createEphemeralTab());

  const managerRef = useRef(createTerminalSessionManager({ profileId }));
  const [initialSnapshots] = useState<TerminalTabSnapshot[]>(() => {
    if (!persistenceEnabled) return [];
    const layout = managerRef.current.loadFromStorage();
    if (!layout.tabs.length) {
      const tab = managerRef.current.createTab();
      return [tab];
    }
    return layout.tabs;
  });
  const initialActiveId = useMemo(() => {
    if (!persistenceEnabled) return undefined;
    const layout = managerRef.current.getLayout();
    return layout.activeTabId ?? initialSnapshots[0]?.id;
  }, [initialSnapshots, persistenceEnabled]);

  const buildTabDefinition = useCallback(
    (tab: TerminalTabSnapshot): TabDefinition => {
      const pane = tab.panes.find((p) => p.id === tab.activePaneId) ?? tab.panes[0];
      const title = tab.lastCommand?.trim() ? tab.lastCommand : tab.title;
      return {
        id: tab.id,
        title,
        content: (
          <Terminal
            key={`${tab.id}-${pane.id}`}
            openApp={openApp}
            sessionId={pane.id}
            initialSnapshot={pane}
            onSnapshot={(snapshot) =>
              managerRef.current.updatePaneSnapshot(tab.id, snapshot)
            }
            snapshotIntervalMs={settings.snapshotIntervalMs}
            restoreBehavior={settings.restoreBehavior}
          />
        ),
        onActivate: () => managerRef.current.setActiveTab(tab.id),
        onClose: () => managerRef.current.removeTab(tab.id),
      };
    },
    [openApp, settings.restoreBehavior, settings.snapshotIntervalMs],
  );

  const persistentInitialTabs = useMemo(
    () => initialSnapshots.map((tab) => buildTabDefinition(tab)),
    [initialSnapshots, buildTabDefinition],
  );

  const handleTabsChange = useCallback((tabs: TabDefinition[]) => {
    managerRef.current.reorderTabs(tabs.map((t) => t.id));
  }, []);

  const handleNewTab = useCallback(() => {
    const tab = managerRef.current.createTab();
    return buildTabDefinition(tab);
  }, [buildTabDefinition]);

  if (!persistenceEnabled) {
    return (
      <TabbedWindow
        className="h-full w-full"
        initialTabs={[fallbackInitialTab]}
        onNewTab={createEphemeralTab}
      />
    );
  }

  return (
    <TabbedWindow
      className="h-full w-full"
      initialTabs={persistentInitialTabs}
      initialActiveId={initialActiveId}
      onNewTab={handleNewTab}
      onTabsChange={handleTabsChange}
    />
  );
};

export default TerminalTabs;
