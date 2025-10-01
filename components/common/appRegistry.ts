import apps from '../../apps.config';

export type AppCommand = 'open' | 'close' | 'toggle' | 'focus' | 'minimize';

export interface AppOpenContext {
  [key: string]: unknown;
}

export interface AppRegistryEntry {
  id: string;
  name: string;
  icon: string;
  disabled: boolean;
  favourite: boolean;
  desktopShortcut: boolean;
  allowMulti: boolean;
  supportsPiP: boolean;
  canReceiveNotifications: boolean;
  prefetch?: () => void;
  open: (context?: AppOpenContext) => void;
  close: () => void;
  toggle: () => void;
  focus: () => void;
  minimize: () => void;
}

export interface AppBadgeSummary {
  id: string;
  unreadCount: number;
}

type MutableRegistryEntry = AppRegistryEntry;

interface NotificationsByApp<T extends { read: boolean }> {
  [appId: string]: T[] | undefined;
}

const DEFAULT_ICON = '/themes/Yaru/apps/application-default-icon.svg';

const normalizeIconPath = (icon: string | undefined): string => {
  if (!icon) return DEFAULT_ICON;
  return icon.replace('./', '/');
};

const pipCapableAppIds = new Set<string>(['youtube', 'screen-recorder']);
const notificationCapableAppIds = new Set<string>([
  'openvas',
  'nmap-nse',
  'metasploit',
  'msf-post',
  'security-tools',
  'nessus',
  'nikto',
  'hydra',
  'john',
  'reconng',
  'terminal',
  'resource-monitor',
]);
const multiInstanceAppIds = new Set<string>(['terminal']);

const registryOrder: string[] = [];
const registryMap: Record<string, MutableRegistryEntry> = {};

const dispatchOpenApp = (id: string, context?: AppOpenContext) => {
  if (typeof window === 'undefined') return;
  const detail = context && Object.keys(context).length > 0 ? { id, ...context } : id;
  window.dispatchEvent(new CustomEvent('open-app', { detail }));
};

const dispatchTaskbarCommand = (id: string, action: AppCommand) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('taskbar-command', { detail: { appId: id, action } }));
};

const createEntry = (app: any): MutableRegistryEntry => {
  const icon = normalizeIconPath(app.icon);
  const supportsPiP = pipCapableAppIds.has(app.id);
  const canReceiveNotifications = notificationCapableAppIds.has(app.id);
  const allowMulti = multiInstanceAppIds.has(app.id);

  const prefetch = typeof app?.screen?.prefetch === 'function'
    ? () => app.screen.prefetch()
    : undefined;

  return {
    id: app.id,
    name: app.title,
    icon,
    disabled: Boolean(app.disabled),
    favourite: Boolean(app.favourite),
    desktopShortcut: Boolean(app.desktop_shortcut),
    allowMulti,
    supportsPiP,
    canReceiveNotifications,
    prefetch,
    open: (context?: AppOpenContext) => dispatchOpenApp(app.id, context),
    close: () => dispatchTaskbarCommand(app.id, 'close'),
    toggle: () => dispatchTaskbarCommand(app.id, 'toggle'),
    focus: () => dispatchTaskbarCommand(app.id, 'focus'),
    minimize: () => dispatchTaskbarCommand(app.id, 'minimize'),
  };
};

const initialiseRegistry = () => {
  const rawApps = apps as any[];
  rawApps.forEach(app => {
    if (!app?.id) return;
    const entry = createEntry(app);
    registryMap[entry.id] = entry;
    registryOrder.push(entry.id);
  });
};

initialiseRegistry();

export const listRegistryEntries = (): AppRegistryEntry[] =>
  registryOrder.map(id => registryMap[id]);

export const getAllAppIds = (): string[] => [...registryOrder];

export const getAppRegistryEntry = (id: string): AppRegistryEntry | undefined => registryMap[id];

export const getAppDisplayName = (id: string): string => getAppRegistryEntry(id)?.name ?? id;

export const getAppIcon = (id: string): string => getAppRegistryEntry(id)?.icon ?? DEFAULT_ICON;

export const appSupportsPiP = (id: string): boolean => Boolean(getAppRegistryEntry(id)?.supportsPiP);

export const appCanReceiveNotifications = (id: string): boolean =>
  Boolean(getAppRegistryEntry(id)?.canReceiveNotifications);

export const getAppBadgeCount = <T extends { read: boolean }>(
  appId: string,
  notificationsByApp?: NotificationsByApp<T>,
): number => {
  if (!notificationsByApp) return 0;
  const list = notificationsByApp[appId] ?? [];
  return list.reduce((count, notification) => count + (notification.read ? 0 : 1), 0);
};

export const getBadgeSummaries = <T extends { read: boolean }>(
  notificationsByApp?: NotificationsByApp<T>,
): AppBadgeSummary[] => {
  if (!notificationsByApp) return [];
  return registryOrder
    .map(id => ({ id, unreadCount: getAppBadgeCount(id, notificationsByApp) }))
    .filter(summary => summary.unreadCount > 0);
};

export const setAppIconOverride = (id: string, icon: string) => {
  const entry = registryMap[id];
  if (!entry) return;
  entry.icon = normalizeIconPath(icon);
};

export interface DynamicAppRegistration {
  id: string;
  title: string;
  icon?: string;
  disabled?: boolean;
  favourite?: boolean;
  desktopShortcut?: boolean;
  allowMulti?: boolean;
  supportsPiP?: boolean;
  canReceiveNotifications?: boolean;
  prefetch?: () => void;
}

export const registerDynamicApp = (config: DynamicAppRegistration) => {
  if (!config?.id) return;
  const existing = registryMap[config.id];
  if (existing) {
    existing.name = config.title || existing.name;
    if (config.icon) existing.icon = normalizeIconPath(config.icon);
    if (typeof config.disabled === 'boolean') existing.disabled = config.disabled;
    if (typeof config.favourite === 'boolean') existing.favourite = config.favourite;
    if (typeof config.desktopShortcut === 'boolean') {
      existing.desktopShortcut = config.desktopShortcut;
    }
    if (typeof config.allowMulti === 'boolean') existing.allowMulti = config.allowMulti;
    if (typeof config.supportsPiP === 'boolean') existing.supportsPiP = config.supportsPiP;
    if (typeof config.canReceiveNotifications === 'boolean') {
      existing.canReceiveNotifications = config.canReceiveNotifications;
    }
    if (config.prefetch) existing.prefetch = config.prefetch;
    return;
  }

  const entry: MutableRegistryEntry = {
    id: config.id,
    name: config.title,
    icon: normalizeIconPath(config.icon),
    disabled: Boolean(config.disabled),
    favourite: Boolean(config.favourite),
    desktopShortcut: Boolean(config.desktopShortcut),
    allowMulti: Boolean(config.allowMulti),
    supportsPiP: Boolean(config.supportsPiP),
    canReceiveNotifications: Boolean(config.canReceiveNotifications),
    prefetch: config.prefetch,
    open: (context?: AppOpenContext) => dispatchOpenApp(config.id, context),
    close: () => dispatchTaskbarCommand(config.id, 'close'),
    toggle: () => dispatchTaskbarCommand(config.id, 'toggle'),
    focus: () => dispatchTaskbarCommand(config.id, 'focus'),
    minimize: () => dispatchTaskbarCommand(config.id, 'minimize'),
  };
  registryMap[entry.id] = entry;
  registryOrder.push(entry.id);
};

export default registryMap;
