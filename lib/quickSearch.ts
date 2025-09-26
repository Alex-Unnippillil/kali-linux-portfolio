import apps from '../apps.config';
import { buildAppMetadata } from './appRegistry';

export type QuickSearchType = 'app' | 'file' | 'setting';

interface QuickSearchBaseItem<T extends QuickSearchType> {
  id: string;
  type: T;
  title: string;
  description?: string;
  keywords: string[];
}

export interface QuickSearchAppItem
  extends QuickSearchBaseItem<'app'> {
  appId: string;
  icon?: string;
}

export interface QuickSearchFileItem
  extends QuickSearchBaseItem<'file'> {
  path: string;
}

export interface QuickSearchSettingItem
  extends QuickSearchBaseItem<'setting'> {
  section: 'appearance' | 'accessibility' | 'system' | 'data';
  settingId?: string;
}

export type QuickSearchItem =
  | QuickSearchAppItem
  | QuickSearchFileItem
  | QuickSearchSettingItem;

export interface QuickSearchIndex {
  apps: QuickSearchAppItem[];
  files: QuickSearchFileItem[];
  settings: QuickSearchSettingItem[];
}

export interface QuickSearchSection {
  type: QuickSearchType;
  title: string;
  items: QuickSearchItem[];
}

type IdleDeadlineLike = { didTimeout: boolean; timeRemaining(): number };

type IdleCallbackHandle = number;

type IdleScheduler = (cb: (deadline: IdleDeadlineLike) => void) => IdleCallbackHandle;

type IdleCanceller = (handle: IdleCallbackHandle) => void;

const SECTION_TITLES: Record<QuickSearchType, string> = {
  app: 'Applications',
  file: 'Files',
  setting: 'Settings',
};

const FILE_ITEMS: QuickSearchFileItem[] = [
  {
    id: 'file:resume',
    type: 'file',
    title: 'Resume.pdf',
    description: 'Download a PDF version of the portfolio resume.',
    keywords: ['resume', 'cv', 'pdf', 'profile'],
    path: '/resume.pdf',
  },
  {
    id: 'file:module-report',
    type: 'file',
    title: 'Sample module report',
    description: 'Open a static HTML export showcasing a module walkthrough.',
    keywords: ['report', 'module', 'html', 'export'],
    path: '/module-report.html',
  },
  {
    id: 'file:terminal-guide',
    type: 'file',
    title: 'Terminal reference',
    description: 'Read the terminal quick reference guide used in demos.',
    keywords: ['terminal', 'guide', 'documentation', 'markdown'],
    path: '/docs/apps/terminal.md',
  },
];

const SETTING_ITEMS: QuickSearchSettingItem[] = [
  {
    id: 'setting:accent',
    type: 'setting',
    title: 'Accent color',
    description: 'Pick a new highlight color for the desktop.',
    keywords: ['color', 'theme', 'appearance', 'highlight'],
    section: 'appearance',
    settingId: 'accent',
  },
  {
    id: 'setting:wallpaper',
    type: 'setting',
    title: 'Wallpaper',
    description: 'Switch between bundled wallpapers and Kali gradient.',
    keywords: ['background', 'image', 'wallpaper'],
    section: 'appearance',
    settingId: 'wallpaper',
  },
  {
    id: 'setting:density',
    type: 'setting',
    title: 'Interface density',
    description: 'Toggle between regular and compact spacing.',
    keywords: ['density', 'spacing', 'layout'],
    section: 'appearance',
    settingId: 'density',
  },
  {
    id: 'setting:font-scale',
    type: 'setting',
    title: 'Font size',
    description: 'Adjust the global font scaling slider.',
    keywords: ['font', 'text', 'size', 'accessibility'],
    section: 'appearance',
    settingId: 'font-scale',
  },
  {
    id: 'setting:reduced-motion',
    type: 'setting',
    title: 'Reduced motion',
    description: 'Limit desktop animations for motion sensitivity.',
    keywords: ['motion', 'accessibility', 'animation'],
    section: 'accessibility',
    settingId: 'reduced-motion',
  },
  {
    id: 'setting:high-contrast',
    type: 'setting',
    title: 'High contrast mode',
    description: 'Boost contrast for improved readability.',
    keywords: ['contrast', 'accessibility'],
    section: 'accessibility',
    settingId: 'high-contrast',
  },
  {
    id: 'setting:large-hit-areas',
    type: 'setting',
    title: 'Large hit areas',
    description: 'Increase touch targets across the desktop.',
    keywords: ['touch', 'accessibility', 'hit area'],
    section: 'accessibility',
    settingId: 'large-hit-areas',
  },
  {
    id: 'setting:haptics',
    type: 'setting',
    title: 'Haptics',
    description: 'Toggle simulated vibration feedback in supported apps.',
    keywords: ['haptics', 'feedback', 'system'],
    section: 'system',
    settingId: 'haptics',
  },
  {
    id: 'setting:pong-spin',
    type: 'setting',
    title: 'Pong spin',
    description: 'Enable advanced physics in the Pong mini-game.',
    keywords: ['game', 'pong', 'spin'],
    section: 'system',
    settingId: 'pong-spin',
  },
  {
    id: 'setting:allow-network',
    type: 'setting',
    title: 'Allow network features',
    description: 'Permit simulated apps to enable optional network calls.',
    keywords: ['network', 'privacy', 'system'],
    section: 'system',
    settingId: 'allow-network',
  },
  {
    id: 'setting:export',
    type: 'setting',
    title: 'Export settings',
    description: 'Download a JSON backup of the desktop configuration.',
    keywords: ['export', 'backup', 'json', 'data'],
    section: 'data',
    settingId: 'export',
  },
  {
    id: 'setting:import',
    type: 'setting',
    title: 'Import settings',
    description: 'Restore a saved configuration from disk.',
    keywords: ['import', 'restore', 'json', 'data'],
    section: 'data',
    settingId: 'import',
  },
  {
    id: 'setting:reset',
    type: 'setting',
    title: 'Reset desktop',
    description: 'Return all preferences to their default values.',
    keywords: ['reset', 'defaults', 'factory'],
    section: 'data',
    settingId: 'reset',
  },
];

let cachedIndex: QuickSearchIndex | null = null;
let scheduledHandle: IdleCallbackHandle | null = null;
let activeCanceller: IdleCanceller | null = null;

const buildIndex = (): QuickSearchIndex => {
  const appItems: QuickSearchAppItem[] = apps
    .filter((app) => !app.disabled)
    .map((app) => {
      const metadata = buildAppMetadata({
        id: app.id,
        title: app.title,
        icon: app.icon,
      });
      return {
        id: `app:${app.id}`,
        type: 'app',
        title: metadata.title,
        description: metadata.description,
        keywords: [app.id, metadata.title, ...(metadata.keyboard ?? [])],
        appId: app.id,
        icon: metadata.icon,
      };
    });

  return {
    apps: appItems,
    files: FILE_ITEMS,
    settings: SETTING_ITEMS,
  };
};

const scheduleIdle = (task: () => void) => {
  if (typeof window === 'undefined') {
    task();
    return;
  }
  const scheduler: IdleScheduler | undefined =
    typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback.bind(window)
      : undefined;
  const canceller: IdleCanceller | undefined =
    typeof window.cancelIdleCallback === 'function'
      ? window.cancelIdleCallback.bind(window)
      : undefined;
  const fallbackScheduler = (cb: (deadline: IdleDeadlineLike) => void) =>
    window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 200);
  const fallbackCanceller = (handle: IdleCallbackHandle) => window.clearTimeout(handle);

  const activeScheduler = scheduler ?? fallbackScheduler;
  activeCanceller = canceller ?? fallbackCanceller;

  const handle = activeScheduler(() => {
    scheduledHandle = null;
    task();
  });
  scheduledHandle = handle;
};

export const getQuickSearchIndex = (): QuickSearchIndex => {
  if (!cachedIndex) {
    cachedIndex = buildIndex();
  }
  return cachedIndex;
};

export const warmQuickSearchIndex = () => {
  if (cachedIndex || scheduledHandle !== null) return;
  scheduleIdle(() => {
    getQuickSearchIndex();
  });
};

export const clearQuickSearchCache = () => {
  cachedIndex = null;
  if (typeof window !== 'undefined' && scheduledHandle !== null) {
    const canceller: IdleCanceller | undefined =
      typeof window.cancelIdleCallback === 'function'
        ? window.cancelIdleCallback.bind(window)
        : undefined;
    if (canceller) {
      canceller(scheduledHandle);
    } else if (activeCanceller) {
      activeCanceller(scheduledHandle);
    } else {
      window.clearTimeout(scheduledHandle);
    }
  }
  scheduledHandle = null;
  activeCanceller = null;
};

const normalize = (value: string) => value.trim().toLowerCase();

const matchesQuery = (item: QuickSearchItem, query: string) => {
  if (!query) return true;
  const haystacks = [item.title, item.description ?? '', ...(item.keywords ?? [])];
  return haystacks.some((value) => normalize(value).includes(query));
};

const mapSection = (
  type: QuickSearchType,
  items: QuickSearchItem[],
  query: string,
): QuickSearchSection | null => {
  const filtered = query
    ? items.filter((item) => matchesQuery(item, query))
    : items;
  if (!filtered.length) return null;
  return {
    type,
    title: SECTION_TITLES[type],
    items: filtered,
  };
};

export const filterQuickSearchIndex = (
  index: QuickSearchIndex,
  query: string,
): QuickSearchSection[] => {
  const normalized = normalize(query);
  const sections: (QuickSearchSection | null)[] = [
    mapSection('app', index.apps, normalized),
    mapSection('file', index.files, normalized),
    mapSection('setting', index.settings, normalized),
  ];
  return sections.filter((section): section is QuickSearchSection => !!section);
};

export const getSectionTitles = () => SECTION_TITLES;

export const flattenSections = (
  sections: QuickSearchSection[],
): QuickSearchItem[] =>
  sections.flatMap((section) => section.items);

