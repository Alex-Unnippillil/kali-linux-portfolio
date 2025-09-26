import Fuse from 'fuse.js';
import appsConfig from '../../apps.config';

type AppConfig = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

export type LauncherGroup = 'Applications' | 'Settings';

export type LauncherAction =
  | { kind: 'open-app'; appId: string }
  | { kind: 'placeholder'; id: string; description: string };

export interface LauncherItem {
  id: string;
  title: string;
  type: 'app' | 'setting';
  icon?: string;
  disabled?: boolean;
  favourite?: boolean;
  keywords: string[];
  group: LauncherGroup;
  subtitle: string;
  action: LauncherAction;
}

export interface LauncherAppItem extends LauncherItem {
  type: 'app';
  icon: string;
}

type LauncherSearch = {
  items: LauncherItem[];
  apps: LauncherAppItem[];
  fuse: Fuse<LauncherItem>;
};

const settingsIcon = '/themes/Yaru/apps/gnome-control-center.png';

const createKeywordSet = (title: string, id: string): string[] => {
  const lower = title.toLowerCase();
  const titleParts = lower.split(/[^a-z0-9]+/i).filter(Boolean);
  const idParts = id.split(/[^a-z0-9]+/i).filter(Boolean);
  return Array.from(new Set([lower, id.toLowerCase(), ...titleParts, ...idParts]));
};

const buildAppItems = (): LauncherAppItem[] => {
  const seen = new Set<string>();
  const list: LauncherAppItem[] = [];
  (appsConfig as AppConfig[]).forEach((app) => {
    if (!app || !app.id || seen.has(app.id)) return;
    seen.add(app.id);
    list.push({
      id: app.id,
      title: app.title,
      type: 'app',
      icon: app.icon,
      disabled: app.disabled,
      favourite: app.favourite,
      keywords: createKeywordSet(app.title, app.id),
      group: 'Applications',
      subtitle: 'Launch application',
      action: { kind: 'open-app', appId: app.id },
    });
  });
  return list;
};

const settingsItems: LauncherItem[] = [
  {
    id: 'settings-open',
    title: 'Open Settings',
    type: 'setting',
    icon: settingsIcon,
    keywords: ['settings', 'preferences', 'system'],
    group: 'Settings',
    subtitle: 'Placeholder command',
    action: { kind: 'placeholder', id: 'open-settings', description: 'Would open the Settings app' },
  },
  {
    id: 'settings-accent',
    title: 'Adjust Accent Color',
    type: 'setting',
    icon: settingsIcon,
    keywords: ['appearance', 'color', 'theme', 'accent'],
    group: 'Settings',
    subtitle: 'Placeholder command',
    action: { kind: 'placeholder', id: 'accent', description: 'Would jump to accent color controls' },
  },
  {
    id: 'settings-font',
    title: 'Tweak Font Size',
    type: 'setting',
    icon: settingsIcon,
    keywords: ['font', 'accessibility', 'size', 'text'],
    group: 'Settings',
    subtitle: 'Placeholder command',
    action: { kind: 'placeholder', id: 'font-size', description: 'Would adjust the global font scale' },
  },
  {
    id: 'settings-motion',
    title: 'Toggle Reduced Motion',
    type: 'setting',
    icon: settingsIcon,
    keywords: ['accessibility', 'motion', 'animation'],
    group: 'Settings',
    subtitle: 'Placeholder command',
    action: { kind: 'placeholder', id: 'reduced-motion', description: 'Would toggle reduced motion' },
  },
  {
    id: 'settings-contrast',
    title: 'Toggle High Contrast',
    type: 'setting',
    icon: settingsIcon,
    keywords: ['accessibility', 'contrast'],
    group: 'Settings',
    subtitle: 'Placeholder command',
    action: { kind: 'placeholder', id: 'high-contrast', description: 'Would toggle high contrast mode' },
  },
  {
    id: 'settings-wallpaper',
    title: 'Choose Wallpaper',
    type: 'setting',
    icon: settingsIcon,
    keywords: ['appearance', 'background', 'wallpaper'],
    group: 'Settings',
    subtitle: 'Placeholder command',
    action: { kind: 'placeholder', id: 'wallpaper', description: 'Would open wallpaper picker' },
  },
];

const buildSearch = (): LauncherSearch => {
  const apps = buildAppItems();
  const items: LauncherItem[] = [...apps, ...settingsItems];
  const fuse = new Fuse(items, {
    includeScore: true,
    threshold: 0.32,
    keys: [
      { name: 'title', weight: 0.7 },
      { name: 'keywords', weight: 0.2 },
      { name: 'id', weight: 0.1 },
    ],
  });
  return { items, apps, fuse };
};

let cached: LauncherSearch | null = null;

export const getLauncherSearch = (): LauncherSearch => {
  if (!cached) {
    cached = buildSearch();
  }
  return cached;
};

export const resetLauncherSearch = () => {
  cached = null;
};

export const getAppItems = (): LauncherAppItem[] => getLauncherSearch().apps;

export const getSettingsCommands = (): LauncherItem[] =>
  getLauncherSearch().items.filter((item) => item.type === 'setting');

export const searchLauncherItems = (query: string): LauncherItem[] => {
  const trimmed = query.trim();
  const { items, fuse } = getLauncherSearch();
  if (!trimmed) {
    return items;
  }
  return fuse.search(trimmed).map((result) => result.item);
};

export const filterAppsByQuery = (
  apps: LauncherAppItem[],
  query: string,
): LauncherAppItem[] => {
  const trimmed = query.trim();
  if (!trimmed) return apps;
  const allowed = new Set(apps.map((app) => app.id));
  return searchLauncherItems(trimmed)
    .filter((item): item is LauncherAppItem => item.type === 'app' && allowed.has(item.id))
    .map((item) => item);
};

export const getDefaultCommands = (): LauncherItem[] => {
  const { apps, items } = getLauncherSearch();
  const favouriteApps = apps.filter((app) => app.favourite).slice(0, 6);
  const settings = items.filter((item) => item.type === 'setting');
  return [...favouriteApps, ...settings];
};

