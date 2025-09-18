import apps, { utilities, games } from '../apps.config';

export interface WhiskerAppMeta {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
}

export interface WhiskerCategoryMeta {
  id: string;
  label: string;
  icon: string;
  description?: string;
  appIds: string[];
}

const rawApps = apps as WhiskerAppMeta[];

const appIndex = new Map(rawApps.map((app) => [app.id, app]));

const dedupe = (ids: string[]) =>
  Array.from(new Set(ids)).filter((id) => appIndex.has(id));

const utilitiesIds = dedupe((utilities as WhiskerAppMeta[]).map((app) => app.id));
const gamesIds = dedupe((games as WhiskerAppMeta[]).map((app) => app.id));

const securityIds = dedupe([
  'autopsy',
  'beef',
  'ble-sensor',
  'dsniff',
  'evidence-vault',
  'ettercap',
  'ghidra',
  'hashcat',
  'hydra',
  'john',
  'kismet',
  'metasploit',
  'mimikatz',
  'mimikatz/offline',
  'msf-post',
  'nessus',
  'nikto',
  'nmap-nse',
  'openvas',
  'radare2',
  'reaver',
  'recon-ng',
  'security-tools',
  'volatility',
  'wireshark',
]);

const developmentIds = dedupe([
  'terminal',
  'vscode',
  'ssh',
  'http',
  'html-rewriter',
  'serial-terminal',
  'x',
]);

const internetIds = dedupe([
  'chrome',
  'spotify',
  'youtube',
  'weather',
  'x',
]);

const productivityIds = dedupe([
  'calculator',
  'converter',
  'gedit',
  'project-gallery',
  'quote',
  'sticky_notes',
  'todoist',
  'weather-widget',
  'contact',
]);

const systemIds = dedupe([
  'about',
  'settings',
  'files',
  'plugin-manager',
  'resource-monitor',
  'screen-recorder',
  'trash',
]);

const assigned = new Set([
  ...utilitiesIds,
  ...gamesIds,
  ...securityIds,
  ...developmentIds,
  ...internetIds,
  ...productivityIds,
  ...systemIds,
]);

const otherIds = dedupe(
  rawApps
    .map((app) => app.id)
    .filter((id) => !assigned.has(id))
);

export const whiskerApps = rawApps;

export const defaultCategoryId = 'favorites';

export const whiskerCategories: WhiskerCategoryMeta[] = [
  {
    id: 'favorites',
    label: 'Favorites',
    icon: '/themes/Yaru/status/projects.svg',
    appIds: [],
  },
  {
    id: 'recent',
    label: 'Recent',
    icon: '/themes/Yaru/status/process-working-symbolic.svg',
    appIds: [],
  },
  {
    id: 'all',
    label: 'All Applications',
    icon: '/themes/Yaru/system/view-app-grid-symbolic.svg',
    appIds: dedupe(rawApps.map((app) => app.id)),
  },
  {
    id: 'security',
    label: 'Offensive Security',
    icon: '/themes/Yaru/apps/metasploit.svg',
    appIds: securityIds,
  },
  {
    id: 'development',
    label: 'Development',
    icon: '/themes/Yaru/apps/vscode.png',
    appIds: developmentIds,
  },
  {
    id: 'internet',
    label: 'Internet',
    icon: '/themes/Yaru/apps/chrome.png',
    appIds: internetIds,
  },
  {
    id: 'productivity',
    label: 'Productivity',
    icon: '/themes/Yaru/apps/todoist.png',
    appIds: productivityIds,
  },
  {
    id: 'system',
    label: 'System',
    icon: '/themes/Yaru/apps/gnome-control-center.png',
    appIds: systemIds,
  },
  {
    id: 'utilities',
    label: 'Utilities',
    icon: '/themes/Yaru/apps/gedit.png',
    appIds: utilitiesIds,
  },
  {
    id: 'games',
    label: 'Games',
    icon: '/themes/Yaru/apps/tetris.svg',
    appIds: gamesIds,
  },
  {
    id: 'other',
    label: 'Extras',
    icon: '/themes/Yaru/apps/project-gallery.svg',
    appIds: otherIds,
  },
];

export const getAppsForCategory = (categoryId: string): WhiskerAppMeta[] => {
  if (categoryId === 'favorites' || categoryId === 'recent') return [];
  const category = whiskerCategories.find((cat) => cat.id === categoryId);
  if (!category) return [];
  return category.appIds
    .map((id) => appIndex.get(id))
    .filter((app): app is WhiskerAppMeta => Boolean(app));
};

export const getAppById = (appId: string) => appIndex.get(appId);

