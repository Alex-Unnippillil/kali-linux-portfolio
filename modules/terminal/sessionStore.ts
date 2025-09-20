import { safeLocalStorage } from '../../utils/safeStorage';

const STORAGE_PREFIX = 'terminal:sessions:';
const CURRENT_VERSION = 1;

function now() {
  return Date.now();
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}-${now().toString(36)}`;
}

export interface TerminalPaneSnapshot {
  id: string;
  scrollback: string;
  history: string[];
  cwd: string;
  lastCommand?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TerminalTabSnapshot {
  id: string;
  title: string;
  panes: TerminalPaneSnapshot[];
  activePaneId: string;
  lastCommand?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TerminalLayoutSnapshot {
  version: number;
  tabs: TerminalTabSnapshot[];
  activeTabId?: string;
  updatedAt: number;
}

export interface TerminalSessionManagerOptions {
  profileId?: string;
  storage?: Storage | undefined;
}

export interface TerminalSessionManager {
  profileId: string;
  storageKey: string;
  getLayout: () => TerminalLayoutSnapshot;
  loadFromStorage: () => TerminalLayoutSnapshot;
  createTab: (title?: string) => TerminalTabSnapshot;
  updatePaneSnapshot: (
    tabId: string,
    pane: TerminalPaneSnapshot,
  ) => TerminalTabSnapshot | undefined;
  recordCommand: (tabId: string, command: string) => void;
  setActiveTab: (tabId: string | null | undefined) => void;
  removeTab: (tabId: string) => void;
  reorderTabs: (order: string[]) => void;
  clear: () => void;
}

function sanitizePane(value: any): TerminalPaneSnapshot {
  const timestamp = now();
  const history = Array.isArray(value?.history)
    ? value.history.filter((entry: unknown) => typeof entry === 'string')
    : [];
  const lastCommandCandidate =
    typeof value?.lastCommand === 'string' && value.lastCommand.trim()
      ? value.lastCommand
      : history[history.length - 1];
  return {
    id: typeof value?.id === 'string' ? value.id : createId('pane'),
    scrollback: typeof value?.scrollback === 'string' ? value.scrollback : '',
    history,
    cwd: typeof value?.cwd === 'string' && value.cwd.trim() ? value.cwd : '~',
    lastCommand: lastCommandCandidate,
    createdAt:
      typeof value?.createdAt === 'number' && Number.isFinite(value.createdAt)
        ? value.createdAt
        : timestamp,
    updatedAt:
      typeof value?.updatedAt === 'number' && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : timestamp,
  };
}

function sanitizeTab(value: any, index: number): TerminalTabSnapshot {
  const timestamp = now();
  const panesRaw = Array.isArray(value?.panes) ? value.panes : [];
  const panes = panesRaw.length
    ? panesRaw.map((pane: any) => sanitizePane(pane))
    : [sanitizePane(undefined)];
  const activePaneCandidate =
    typeof value?.activePaneId === 'string' &&
    panes.some((p) => p.id === value.activePaneId)
      ? value.activePaneId
      : panes[0].id;
  const lastCommandCandidate =
    typeof value?.lastCommand === 'string' && value.lastCommand.trim()
      ? value.lastCommand
      : panes.find((pane) => pane.id === activePaneCandidate)?.lastCommand;
  return {
    id: typeof value?.id === 'string' ? value.id : createId('tab'),
    title:
      typeof value?.title === 'string' && value.title.trim()
        ? value.title
        : `Session ${index + 1}`,
    panes,
    activePaneId: activePaneCandidate,
    lastCommand: lastCommandCandidate,
    createdAt:
      typeof value?.createdAt === 'number' && Number.isFinite(value.createdAt)
        ? value.createdAt
        : timestamp,
    updatedAt:
      typeof value?.updatedAt === 'number' && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : timestamp,
  };
}

function sanitizeLayout(value: any): TerminalLayoutSnapshot {
  const timestamp = now();
  const tabsRaw = Array.isArray(value?.tabs) ? value.tabs : [];
  const tabs = tabsRaw.map((tab: any, index: number) => sanitizeTab(tab, index));
  const activeTabCandidate =
    typeof value?.activeTabId === 'string' &&
    tabs.some((tab) => tab.id === value.activeTabId)
      ? value.activeTabId
      : tabs[0]?.id;
  return {
    version:
      typeof value?.version === 'number' && Number.isFinite(value.version)
        ? value.version
        : CURRENT_VERSION,
    tabs,
    activeTabId: activeTabCandidate,
    updatedAt:
      typeof value?.updatedAt === 'number' && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : timestamp,
  };
}

function createEmptyLayout(): TerminalLayoutSnapshot {
  return {
    version: CURRENT_VERSION,
    tabs: [],
    activeTabId: undefined,
    updatedAt: now(),
  };
}

function createPaneSnapshot(
  overrides: Partial<TerminalPaneSnapshot> = {},
): TerminalPaneSnapshot {
  const timestamp = now();
  return sanitizePane({
    id: overrides.id ?? createId('pane'),
    scrollback: overrides.scrollback ?? '',
    history: overrides.history ?? [],
    cwd: overrides.cwd ?? '~',
    lastCommand: overrides.lastCommand,
    createdAt: overrides.createdAt ?? timestamp,
    updatedAt: overrides.updatedAt ?? timestamp,
  });
}

function createTabSnapshot(
  index: number,
  overrides: Partial<TerminalTabSnapshot> = {},
): TerminalTabSnapshot {
  const pane = overrides.panes?.[0] ?? createPaneSnapshot();
  return sanitizeTab(
    {
      id: overrides.id ?? createId('tab'),
      title: overrides.title ?? `Session ${index + 1}`,
      panes: overrides.panes ?? [pane],
      activePaneId: overrides.activePaneId ?? pane.id,
      lastCommand: overrides.lastCommand ?? pane.lastCommand,
      createdAt: overrides.createdAt,
      updatedAt: overrides.updatedAt,
    },
    index,
  );
}

export function createTerminalSessionManager(
  options: TerminalSessionManagerOptions = {},
): TerminalSessionManager {
  const { profileId = 'default', storage = safeLocalStorage } = options;
  const storageKey = `${STORAGE_PREFIX}${profileId}`;

  const loadFromStorageInternal = () => {
    if (!storage) return createEmptyLayout();
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return createEmptyLayout();
      const parsed = JSON.parse(raw);
      return sanitizeLayout(parsed);
    } catch {
      return createEmptyLayout();
    }
  };

  let layout = loadFromStorageInternal();

  const persist = () => {
    if (!storage) return;
    try {
      storage.setItem(storageKey, JSON.stringify(layout));
    } catch {
      // ignore storage failures (quota, privacy, etc.)
    }
  };

  const getLayout = () => layout;

  const setLayout = (next: TerminalLayoutSnapshot) => {
    layout = {
      ...next,
      version: CURRENT_VERSION,
      updatedAt: now(),
    };
    persist();
    return layout;
  };

  const createTab = (title?: string) => {
    const current = getLayout();
    const tab = createTabSnapshot(current.tabs.length, {
      title: title ?? `Session ${current.tabs.length + 1}`,
    });
    const nextTabs = [...current.tabs, tab];
    setLayout({ ...current, tabs: nextTabs, activeTabId: tab.id });
    return tab;
  };

  const updatePaneSnapshot = (
    tabId: string,
    pane: TerminalPaneSnapshot,
  ): TerminalTabSnapshot | undefined => {
    const current = getLayout();
    let updatedTab: TerminalTabSnapshot | undefined;
    const nextTabs = current.tabs.map((tab) => {
      if (tab.id !== tabId) return tab;
      const sanitized = sanitizePane(pane);
      const panes = tab.panes.some((p) => p.id === sanitized.id)
        ? tab.panes.map((p) => (p.id === sanitized.id ? sanitized : p))
        : [...tab.panes, sanitized];
      const nextTab: TerminalTabSnapshot = {
        ...tab,
        panes,
        activePaneId: sanitized.id,
        lastCommand: sanitized.lastCommand ?? tab.lastCommand,
        title:
          sanitized.lastCommand && sanitized.lastCommand.trim()
            ? sanitized.lastCommand
            : tab.title,
        updatedAt: now(),
      };
      updatedTab = nextTab;
      return nextTab;
    });
    if (updatedTab) {
      setLayout({ ...current, tabs: nextTabs });
    }
    return updatedTab;
  };

  const recordCommand = (tabId: string, command: string) => {
    const trimmed = command.trim();
    const current = getLayout();
    const nextTabs = current.tabs.map((tab) => {
      if (tab.id !== tabId) return tab;
      const updatedPanes = tab.panes.map((pane) =>
        pane.id === tab.activePaneId
          ? {
              ...pane,
              lastCommand: trimmed || pane.lastCommand,
              updatedAt: now(),
            }
          : pane,
      );
      return {
        ...tab,
        panes: updatedPanes,
        lastCommand: trimmed || tab.lastCommand,
        title: trimmed || tab.title,
        updatedAt: now(),
      };
    });
    setLayout({ ...current, tabs: nextTabs });
  };

  const setActiveTab = (tabId: string | null | undefined) => {
    const current = getLayout();
    if (current.activeTabId === tabId) return;
    setLayout({ ...current, activeTabId: tabId ?? undefined });
  };

  const removeTab = (tabId: string) => {
    const current = getLayout();
    const nextTabs = current.tabs.filter((tab) => tab.id !== tabId);
    const nextActive =
      current.activeTabId === tabId ? nextTabs[0]?.id : current.activeTabId;
    setLayout({ ...current, tabs: nextTabs, activeTabId: nextActive });
  };

  const reorderTabs = (order: string[]) => {
    const current = getLayout();
    if (!order.length) return;
    const tabMap = new Map(current.tabs.map((tab) => [tab.id, tab] as const));
    const nextTabs: TerminalTabSnapshot[] = [];
    for (const id of order) {
      const tab = tabMap.get(id);
      if (tab) {
        nextTabs.push(tab);
        tabMap.delete(id);
      }
    }
    // append remaining tabs that were not specified in the new order
    nextTabs.push(...tabMap.values());
    setLayout({ ...current, tabs: nextTabs });
  };

  const clear = () => {
    layout = createEmptyLayout();
    if (!storage) return;
    try {
      storage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  return {
    profileId,
    storageKey,
    getLayout,
    loadFromStorage: () => {
      layout = loadFromStorageInternal();
      return layout;
    },
    createTab,
    updatePaneSnapshot,
    recordCommand,
    setActiveTab,
    removeTab,
    reorderTabs,
    clear,
  };
}

export default createTerminalSessionManager;
