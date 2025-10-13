import schemaDefinition from '../../data/project-templates/schema.json';
import templatesCatalog from '../../data/project-templates/templates.json';

export type WorkspaceTabType = 'terminal' | 'notes' | 'report' | 'visualizer';

export interface WorkspaceTabData {
  command?: string;
  body?: string;
  dataSource?: string;
}

export interface WorkspaceTab {
  id: string;
  title: string;
  type: WorkspaceTabType;
  pinned?: boolean;
  data?: WorkspaceTabData;
}

export type WorkspaceLayout = 'grid' | 'focus' | 'column';
export type WorkspaceTheme = 'terminal' | 'midnight' | 'blueprint';
export type NotebookVisibility = 'collapsed' | 'expanded';

export interface WorkspaceSettings {
  layout: WorkspaceLayout;
  theme: WorkspaceTheme;
  showTelemetry?: boolean;
  pinnedTools?: string[];
  notebookVisibility?: NotebookVisibility;
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  badges?: string[];
  workspace: {
    tabs: WorkspaceTab[];
    settings: WorkspaceSettings;
  };
}

export interface WorkspaceTemplateCatalog {
  version: number;
  templates: WorkspaceTemplate[];
}

export interface WorkspaceState {
  id: string;
  templateId: string;
  name: string;
  createdAt: number;
  tabs: WorkspaceTab[];
  settings: WorkspaceSettings;
}

export interface WorkspaceStoreSnapshot {
  activeWorkspaceId: string | null;
  workspaces: WorkspaceState[];
}

export interface HistoryPreview {
  id: string;
  description: string;
  expiresAt: number;
}

type Listener = (snapshot: WorkspaceStoreSnapshot) => void;

type SchemaEnum = string[] | undefined;

const ensureArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getSchemaEnum = (path: string[]): SchemaEnum => {
  let current: unknown = schemaDefinition as unknown;
  for (const key of path) {
    if (!isObject(current) || !(key in current)) {
      return undefined;
    }
    current = current[key];
  }
  return Array.isArray(current) ? (current as string[]) : undefined;
};

const allowedTabTypes = getSchemaEnum(['definitions', 'tab', 'properties', 'type', 'enum']) ?? [
  'terminal',
  'notes',
  'report',
  'visualizer',
];
const allowedLayouts = getSchemaEnum(['definitions', 'settings', 'properties', 'layout', 'enum']) ?? [
  'grid',
  'focus',
  'column',
];
const allowedThemes = getSchemaEnum(['definitions', 'settings', 'properties', 'theme', 'enum']) ?? [
  'terminal',
  'midnight',
  'blueprint',
];
const allowedNotebookVisibilities = getSchemaEnum([
  'definitions',
  'settings',
  'properties',
  'notebookVisibility',
  'enum',
]) ?? ['collapsed', 'expanded'];

const validateTab = (tab: unknown, index: number, templateId: string): WorkspaceTab => {
  if (!isObject(tab)) {
    throw new Error(`Template ${templateId} tab #${index} must be an object`);
  }
  const { id, title, type, pinned, data } = tab;
  if (typeof id !== 'string' || !id) {
    throw new Error(`Template ${templateId} tab #${index} is missing a string id`);
  }
  if (typeof title !== 'string' || !title) {
    throw new Error(`Template ${templateId} tab ${id} is missing a title`);
  }
  if (typeof type !== 'string' || !allowedTabTypes.includes(type)) {
    throw new Error(`Template ${templateId} tab ${id} has invalid type`);
  }
  if (pinned !== undefined && typeof pinned !== 'boolean') {
    throw new Error(`Template ${templateId} tab ${id} has invalid pinned flag`);
  }
  let normalizedData: WorkspaceTabData | undefined;
  if (data !== undefined) {
    if (!isObject(data)) {
      throw new Error(`Template ${templateId} tab ${id} data must be an object`);
    }
    const candidate: WorkspaceTabData = {};
    if ('command' in data) {
      if (typeof data.command !== 'string') {
        throw new Error(`Template ${templateId} tab ${id} data.command must be string`);
      }
      candidate.command = data.command;
    }
    if ('body' in data) {
      if (typeof data.body !== 'string') {
        throw new Error(`Template ${templateId} tab ${id} data.body must be string`);
      }
      candidate.body = data.body;
    }
    if ('dataSource' in data) {
      if (typeof data.dataSource !== 'string') {
        throw new Error(`Template ${templateId} tab ${id} data.dataSource must be string`);
      }
      candidate.dataSource = data.dataSource;
    }
    normalizedData = candidate;
  }
  return { id, title, type: type as WorkspaceTabType, pinned, data: normalizedData };
};

const validateSettings = (templateId: string, settings: unknown): WorkspaceSettings => {
  if (!isObject(settings)) {
    throw new Error(`Template ${templateId} settings must be an object`);
  }
  const { layout, theme, showTelemetry, pinnedTools, notebookVisibility } = settings;
  if (typeof layout !== 'string' || !allowedLayouts.includes(layout)) {
    throw new Error(`Template ${templateId} settings have invalid layout`);
  }
  if (typeof theme !== 'string' || !allowedThemes.includes(theme)) {
    throw new Error(`Template ${templateId} settings have invalid theme`);
  }
  if (showTelemetry !== undefined && typeof showTelemetry !== 'boolean') {
    throw new Error(`Template ${templateId} settings showTelemetry must be boolean`);
  }
  let normalizedPinned: string[] | undefined;
  if (pinnedTools !== undefined) {
    if (!Array.isArray(pinnedTools)) {
      throw new Error(`Template ${templateId} settings pinnedTools must be an array`);
    }
    pinnedTools.forEach((tool, index) => {
      if (typeof tool !== 'string') {
        throw new Error(`Template ${templateId} settings pinnedTools[${index}] must be string`);
      }
    });
    normalizedPinned = [...pinnedTools];
  }
  let normalizedNotebookVisibility: NotebookVisibility | undefined;
  if (notebookVisibility !== undefined) {
    if (typeof notebookVisibility !== 'string' || !allowedNotebookVisibilities.includes(notebookVisibility)) {
      throw new Error(`Template ${templateId} settings notebookVisibility is invalid`);
    }
    normalizedNotebookVisibility = notebookVisibility as NotebookVisibility;
  }
  return {
    layout: layout as WorkspaceLayout,
    theme: theme as WorkspaceTheme,
    showTelemetry: showTelemetry as boolean | undefined,
    pinnedTools: normalizedPinned,
    notebookVisibility: normalizedNotebookVisibility,
  };
};

const validateTemplate = (template: unknown): WorkspaceTemplate => {
  if (!isObject(template)) {
    throw new Error('Template entry must be an object');
  }
  const { id, name, description, tags, badges, workspace } = template;
  if (typeof id !== 'string' || !id) {
    throw new Error('Template is missing id');
  }
  if (typeof name !== 'string' || !name) {
    throw new Error(`Template ${id} is missing name`);
  }
  if (typeof description !== 'string' || !description) {
    throw new Error(`Template ${id} is missing description`);
  }
  if (!Array.isArray(tags)) {
    throw new Error(`Template ${id} tags must be an array`);
  }
  tags.forEach((tag, index) => {
    if (typeof tag !== 'string') {
      throw new Error(`Template ${id} tag at index ${index} must be string`);
    }
  });
  let normalizedBadges: string[] | undefined;
  if (badges !== undefined) {
    if (!Array.isArray(badges)) {
      throw new Error(`Template ${id} badges must be an array of strings`);
    }
    badges.forEach((badge, index) => {
      if (typeof badge !== 'string') {
        throw new Error(`Template ${id} badge at index ${index} must be string`);
      }
    });
    normalizedBadges = [...badges];
  }
  if (!isObject(workspace)) {
    throw new Error(`Template ${id} workspace must be an object`);
  }
  const rawTabs = ensureArray(workspace.tabs);
  if (rawTabs.length === 0) {
    throw new Error(`Template ${id} must define at least one tab`);
  }
  const tabs = rawTabs.map((tab, index) => validateTab(tab, index, id));
  const settings = validateSettings(id, workspace.settings);
  return {
    id,
    name,
    description,
    tags: [...tags],
    badges: normalizedBadges,
    workspace: {
      tabs,
      settings,
    },
  };
};

const validateCatalog = (catalog: unknown): WorkspaceTemplateCatalog => {
  if (!isObject(catalog)) {
    throw new Error('Template catalog must be an object');
  }
  const { version, templates } = catalog;
  if (typeof version !== 'number' || Number.isNaN(version)) {
    throw new Error('Template catalog version must be a number');
  }
  if (!Array.isArray(templates) || templates.length === 0) {
    throw new Error('Template catalog templates must be a non-empty array');
  }
  const normalizedTemplates = templates.map(template => validateTemplate(template));
  return {
    version,
    templates: normalizedTemplates,
  };
};

const templateCatalog: WorkspaceTemplateCatalog = validateCatalog(templatesCatalog as unknown);

const listeners = new Set<Listener>();

let workspaceSequence = 0;

const cloneTab = (tab: WorkspaceTab): WorkspaceTab => ({
  id: tab.id,
  title: tab.title,
  type: tab.type,
  pinned: tab.pinned,
  data: tab.data ? { ...tab.data } : undefined,
});

const cloneSettings = (settings: WorkspaceSettings): WorkspaceSettings => ({
  layout: settings.layout,
  theme: settings.theme,
  showTelemetry: settings.showTelemetry,
  pinnedTools: settings.pinnedTools ? [...settings.pinnedTools] : undefined,
  notebookVisibility: settings.notebookVisibility,
});

const cloneWorkspace = (workspace: WorkspaceState): WorkspaceState => ({
  id: workspace.id,
  templateId: workspace.templateId,
  name: workspace.name,
  createdAt: workspace.createdAt,
  tabs: workspace.tabs.map(cloneTab),
  settings: cloneSettings(workspace.settings),
});

const cloneStore = (store: WorkspaceStoreSnapshot): WorkspaceStoreSnapshot => ({
  activeWorkspaceId: store.activeWorkspaceId,
  workspaces: store.workspaces.map(cloneWorkspace),
});

let storeState: WorkspaceStoreSnapshot = {
  activeWorkspaceId: null,
  workspaces: [],
};

interface HistoryEntryInternal {
  id: string;
  description: string;
  expiresAt: number;
  timeout: ReturnType<typeof setTimeout> | null;
  restore: WorkspaceStoreSnapshot;
}

let pendingHistory: HistoryEntryInternal | null = null;

const emit = () => {
  const snapshot = getState();
  listeners.forEach(listener => listener(snapshot));
};

const scheduleHistory = (description: string, previousState: WorkspaceStoreSnapshot, ttlMs = 10_000) => {
  if (pendingHistory?.timeout) {
    clearTimeout(pendingHistory.timeout);
  }
  const entry: HistoryEntryInternal = {
    id: `undo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description,
    expiresAt: Date.now() + ttlMs,
    timeout: null,
    restore: cloneStore(previousState),
  };
  entry.timeout = setTimeout(() => {
    pendingHistory = null;
  }, ttlMs);
  pendingHistory = entry;
};

export const getTemplates = (): WorkspaceTemplate[] => templateCatalog.templates.map(template => ({
  ...template,
  workspace: {
    tabs: template.workspace.tabs.map(cloneTab),
    settings: cloneSettings(template.workspace.settings),
  },
}));

export const getState = (): WorkspaceStoreSnapshot => cloneStore(storeState);

export const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
  listener(getState());
  return () => {
    listeners.delete(listener);
  };
};

const setStore = (nextState: WorkspaceStoreSnapshot) => {
  storeState = cloneStore(nextState);
  emit();
};

export const resetWorkspaceStore = () => {
  if (pendingHistory?.timeout) {
    clearTimeout(pendingHistory.timeout);
  }
  pendingHistory = null;
  workspaceSequence = 0;
  storeState = {
    activeWorkspaceId: null,
    workspaces: [],
  };
  emit();
};

export const createWorkspaceFromTemplate = (templateId: string, options?: { name?: string }): WorkspaceState => {
  const template = templateCatalog.templates.find(entry => entry.id === templateId);
  if (!template) {
    throw new Error(`Unknown workspace template: ${templateId}`);
  }
  const previousState = getState();
  workspaceSequence += 1;
  const workspaceId = `${templateId}-${Date.now()}-${workspaceSequence}`;
  const name = options?.name?.trim() || template.name;
  const workspace: WorkspaceState = {
    id: workspaceId,
    templateId: template.id,
    name,
    createdAt: Date.now(),
    tabs: template.workspace.tabs.map(cloneTab),
    settings: cloneSettings(template.workspace.settings),
  };
  const nextState: WorkspaceStoreSnapshot = {
    activeWorkspaceId: workspace.id,
    workspaces: [...storeState.workspaces.map(cloneWorkspace), workspace],
  };
  setStore(nextState);
  scheduleHistory(`Created workspace \"${workspace.name}\"`, previousState);
  return cloneWorkspace(workspace);
};

export const setActiveWorkspace = (workspaceId: string | null) => {
  if (workspaceId === null) {
    setStore({
      ...storeState,
      activeWorkspaceId: null,
      workspaces: storeState.workspaces.map(cloneWorkspace),
    });
    return;
  }
  const exists = storeState.workspaces.some(workspace => workspace.id === workspaceId);
  if (!exists) return;
  setStore({
    ...storeState,
    activeWorkspaceId: workspaceId,
    workspaces: storeState.workspaces.map(cloneWorkspace),
  });
};

export const getPendingHistoryAction = (): HistoryPreview | null => {
  if (!pendingHistory) return null;
  return {
    id: pendingHistory.id,
    description: pendingHistory.description,
    expiresAt: pendingHistory.expiresAt,
  };
};

export const undoHistoryAction = (id?: string): boolean => {
  if (!pendingHistory) return false;
  if (id && pendingHistory.id !== id) {
    return false;
  }
  if (pendingHistory.timeout) {
    clearTimeout(pendingHistory.timeout);
  }
  const restoreState = cloneStore(pendingHistory.restore);
  pendingHistory = null;
  setStore(restoreState);
  return true;
};
