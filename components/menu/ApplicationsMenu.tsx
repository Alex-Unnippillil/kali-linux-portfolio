import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import apps from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import { readRecentAppIds, RECENT_STORAGE_KEY } from '../../utils/recentStorage';

export type KaliCategory = {
  id: string;
  label: string;
};

export const KALI_CATEGORIES: KaliCategory[] = [
  { id: 'information-gathering', label: 'Information Gathering' },
  { id: 'vulnerability-analysis', label: 'Vulnerability Analysis' },
  { id: 'web-application-analysis', label: 'Web Application Analysis' },
  { id: 'database-assessment', label: 'Database Assessment' },
  { id: 'password-attacks', label: 'Password Attacks' },
  { id: 'wireless-attacks', label: 'Wireless Attacks' },
  { id: 'reverse-engineering', label: 'Reverse Engineering' },
  { id: 'exploitation-tools', label: 'Exploitation Tools' },
  { id: 'sniffing-spoofing', label: 'Sniffing & Spoofing' },
  { id: 'post-exploitation', label: 'Post Exploitation' },
  { id: 'forensics', label: 'Forensics' },
  { id: 'reporting', label: 'Reporting' },
  { id: 'social-engineering', label: 'Social Engineering' },
  { id: 'hardware-hacking', label: 'Hardware Hacking' },
  { id: 'extra', label: 'Extra' },
  { id: 'top10', label: 'Top 10 Security Tools' },
];

const DEFAULT_CATEGORY_ICON = '/themes/Yaru/status/preferences-system-symbolic.svg';

const CATEGORY_ICON_LOOKUP: Record<string, string> = {
  'information-gathering': '/themes/kali/categories/information-gathering.svg',
  'vulnerability-analysis': '/themes/kali/categories/vulnerability-analysis.svg',
  'web-application-analysis': '/themes/kali/categories/web-application-analysis.svg',
  'database-assessment': '/themes/kali/categories/database-assessment.svg',
  'password-attacks': '/themes/kali/categories/password-attacks.svg',
  'wireless-attacks': '/themes/kali/categories/wireless-attacks.svg',
  'reverse-engineering': '/themes/kali/categories/reverse-engineering.svg',
  'exploitation-tools': '/themes/kali/categories/exploitation-tools.svg',
  'sniffing-spoofing': '/themes/kali/categories/sniffing-spoofing.svg',
  'sniffing-and-spoofing': '/themes/kali/categories/sniffing-spoofing.svg',
  'post-exploitation': '/themes/kali/categories/post-exploitation.svg',
  'maintaining-access': '/themes/kali/categories/post-exploitation.svg',
  'forensics': '/themes/kali/categories/forensics.svg',
  'reporting': '/themes/kali/categories/reporting.svg',
  'reporting-tools': '/themes/kali/categories/reporting.svg',
  'social-engineering': '/themes/kali/categories/social-engineering.svg',
  'social-engineering-tools': '/themes/kali/categories/social-engineering.svg',
  'hardware-hacking': '/themes/kali/categories/hardware-hacking.svg',
  'extra': '/themes/kali/categories/extra.svg',
  'miscellaneous': '/themes/kali/categories/extra.svg',
  'top10': '/themes/kali/categories/top10.svg',
  'top-10-tools': '/themes/kali/categories/top10.svg',
  'stress-testing': '/themes/kali/categories/exploitation-tools.svg',
};

const CATEGORY_ALIASES: Record<string, string> = {
  'sniffing-and-spoofing': 'sniffing-spoofing',
  'sniffing and spoofing': 'sniffing-spoofing',
  'maintaining-access': 'post-exploitation',
  'maintaining access': 'post-exploitation',
  'reporting-tools': 'reporting',
  'reporting tools': 'reporting',
  'social-engineering-tools': 'social-engineering',
  'social engineering tools': 'social-engineering',
  miscellaneous: 'extra',
  'top-10-tools': 'top10',
  'top 10 tools': 'top10',
  'stress-testing': 'exploitation-tools',
  'stress testing': 'exploitation-tools',
};

const DEFAULT_KALI_CATEGORY = 'utilities';
const FAVORITES_STORAGE_KEYS = ['kali-favorites', 'launcherFavorites'];

type LauncherAppMetadata = {
  kaliCategory?: string | null;
  category?: string | null;
};

export type LauncherApp = {
  id: string;
  title: string;
  icon?: string;
  disabled?: boolean;
  favourite?: boolean;
  metadata?: LauncherAppMetadata | null;
} & Record<string, unknown>;

type MetadataRecord = Record<string, LauncherAppMetadata | undefined>;

export type ApplicationsMenuView = 'all' | 'favorites' | 'recents';

type UseApplicationsMenuOptions = {
  searchQuery?: string;
  view?: ApplicationsMenuView;
  kaliCategory?: string;
  metadata?: MetadataRecord;
};

type UseApplicationsMenuResult = {
  allApps: LauncherApp[];
  favorites: LauncherApp[];
  recents: LauncherApp[];
  filteredAll: LauncherApp[];
  filteredFavorites: LauncherApp[];
  filteredRecents: LauncherApp[];
  currentApps: LauncherApp[];
};

const KNOWN_CATEGORY_IDS = new Set<string>([
  ...KALI_CATEGORIES.map((category) => category.id),
  DEFAULT_KALI_CATEGORY,
  'all',
]);

const CATEGORY_LABEL_LOOKUP = KALI_CATEGORIES.reduce<Record<string, string>>((acc, category) => {
  const label = category.label.toLowerCase();
  acc[label] = category.id;
  acc[label.replace(/&/g, 'and')] = category.id;
  return acc;
}, { utilities: DEFAULT_KALI_CATEGORY, [DEFAULT_KALI_CATEGORY]: DEFAULT_KALI_CATEGORY });

const normalizeCategoryId = (value?: string | null): string => {
  if (!value) return DEFAULT_KALI_CATEGORY;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_KALI_CATEGORY;
  const lower = trimmed.toLowerCase();

  if (CATEGORY_LABEL_LOOKUP[lower]) {
    return CATEGORY_LABEL_LOOKUP[lower];
  }

  if (CATEGORY_ALIASES[lower]) {
    return CATEGORY_ALIASES[lower];
  }

  if (KNOWN_CATEGORY_IDS.has(lower)) {
    return lower;
  }

  const sanitized = lower
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (CATEGORY_LABEL_LOOKUP[sanitized]) {
    return CATEGORY_LABEL_LOOKUP[sanitized];
  }

  if (CATEGORY_ALIASES[sanitized]) {
    return CATEGORY_ALIASES[sanitized];
  }

  if (KNOWN_CATEGORY_IDS.has(sanitized)) {
    return sanitized;
  }

  return DEFAULT_KALI_CATEGORY;
};

const parseStoredIds = (raw: string | null): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed.filter((value): value is string => {
      if (typeof value !== 'string') return false;
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  } catch {
    return [];
  }
};

const readFavoriteOverrides = (): { ids: string[]; hasOverride: boolean } => {
  if (!safeLocalStorage) return { ids: [], hasOverride: false };
  for (const key of FAVORITES_STORAGE_KEYS) {
    try {
      const raw = safeLocalStorage.getItem(key);
      if (raw === null) continue;
      return { ids: parseStoredIds(raw), hasOverride: true };
    } catch {
      return { ids: [], hasOverride: false };
    }
  }
  return { ids: [], hasOverride: false };
};

const buildMetadataMap = (appsList: LauncherApp[], external?: MetadataRecord): Record<string, string> => {
  const map: Record<string, string> = {};

  if (external) {
    for (const [id, entry] of Object.entries(external)) {
      if (!entry) continue;
      const candidate =
        typeof entry.kaliCategory === 'string' && entry.kaliCategory.trim()
          ? entry.kaliCategory
          : typeof entry.category === 'string' && entry.category.trim()
            ? entry.category
            : undefined;
      const normalized = normalizeCategoryId(candidate ?? undefined);
      if (normalized) {
        map[id] = normalized;
      }
    }
  }

  appsList.forEach((app) => {
    if (map[app.id]) return;

    const direct = typeof (app as Record<string, unknown>).kaliCategory === 'string'
      ? (app as Record<string, string>).kaliCategory
      : undefined;

    const meta = app.metadata;
    let candidate: string | undefined;

    if (typeof direct === 'string' && direct.trim()) {
      candidate = direct;
    } else if (meta && typeof meta === 'object') {
      const metaRecord = meta as Record<string, unknown>;
      const metaCategory = metaRecord.kaliCategory;
      const fallbackCategory = metaRecord.category;
      if (typeof metaCategory === 'string' && metaCategory.trim()) {
        candidate = metaCategory;
      } else if (typeof fallbackCategory === 'string' && fallbackCategory.trim()) {
        candidate = fallbackCategory;
      }
    }

    const normalized = normalizeCategoryId(candidate);
    if (normalized) {
      map[app.id] = normalized;
    }
  });

  return map;
};

const filterByCategoryAndQuery = (
  list: LauncherApp[],
  metadataMap: Record<string, string>,
  category: string,
  query: string,
): LauncherApp[] => {
  const normalizedCategory = category || DEFAULT_KALI_CATEGORY;
  const normalizedQuery = query.trim().toLowerCase();
  const isAllCategory = normalizedCategory === 'all';

  const byCategory = isAllCategory
    ? list
    : list.filter((app) => (metadataMap[app.id] ?? DEFAULT_KALI_CATEGORY) === normalizedCategory);

  if (!normalizedQuery) {
    return byCategory;
  }

  return byCategory.filter((app) => (app.title ?? '').toLowerCase().includes(normalizedQuery));
};

export const useApplicationsMenuData = (
  options: UseApplicationsMenuOptions = {},
): UseApplicationsMenuResult => {
  const { searchQuery = '', view = 'all', kaliCategory, metadata } = options;

  const [storageVersion, setStorageVersion] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleStorage = (event: StorageEvent) => {
      const key = event.key ?? '';
      if (FAVORITES_STORAGE_KEYS.includes(key) || key === RECENT_STORAGE_KEY) {
        setStorageVersion((value) => value + 1);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const baseApps = useMemo<LauncherApp[]>(
    () => (Array.isArray(apps) ? (apps as LauncherApp[]).map((app) => ({ ...app })) : []),
    [],
  );

  const favoriteOverride = useMemo(readFavoriteOverrides, [storageVersion]);

  const allApps = useMemo<LauncherApp[]>(() => {
    if (!favoriteOverride.hasOverride) {
      return baseApps;
    }
    const overrideSet = new Set(favoriteOverride.ids);
    return baseApps.map((app) => ({
      ...app,
      favourite: overrideSet.has(app.id),
    }));
  }, [baseApps, favoriteOverride]);

  const favorites = useMemo(
    () => allApps.filter((app) => Boolean(app.favourite)),
    [allApps],
  );

  const recents = useMemo(() => {
    const ids = readRecentAppIds();
    if (!ids.length) return [] as LauncherApp[];
    const appMap = new Map(allApps.map((app) => [app.id, app] as const));
    const seen = new Set<string>();
    const result: LauncherApp[] = [];
    ids.forEach((id) => {
      if (seen.has(id)) return;
      const match = appMap.get(id);
      if (!match) return;
      seen.add(id);
      result.push(match);
    });
    return result;
  }, [allApps, storageVersion]);

  const metadataMap = useMemo(
    () => buildMetadataMap(allApps, metadata),
    [allApps, metadata],
  );

  const normalizedCategory = useMemo(
    () => normalizeCategoryId(kaliCategory),
    [kaliCategory],
  );

  const filteredAll = useMemo(
    () => filterByCategoryAndQuery(allApps, metadataMap, normalizedCategory, searchQuery),
    [allApps, metadataMap, normalizedCategory, searchQuery],
  );

  const filteredFavorites = useMemo(
    () => filterByCategoryAndQuery(favorites, metadataMap, normalizedCategory, searchQuery),
    [favorites, metadataMap, normalizedCategory, searchQuery],
  );

  const filteredRecents = useMemo(
    () => filterByCategoryAndQuery(recents, metadataMap, normalizedCategory, searchQuery),
    [recents, metadataMap, normalizedCategory, searchQuery],
  );

  const currentApps = useMemo(() => {
    switch (view) {
      case 'favorites':
        return filteredFavorites;
      case 'recents':
        return filteredRecents;
      default:
        return filteredAll;
    }
  }, [view, filteredAll, filteredFavorites, filteredRecents]);

  return {
    allApps,
    favorites,
    recents,
    filteredAll,
    filteredFavorites,
    filteredRecents,
    currentApps,
  };
};

type CategoryIconProps = {
  categoryId: string;
  label: string;
};

const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryId, label }) => {
  const [src, setSrc] = useState<string>(CATEGORY_ICON_LOOKUP[categoryId] ?? DEFAULT_CATEGORY_ICON);

  useEffect(() => {
    setSrc(CATEGORY_ICON_LOOKUP[categoryId] ?? DEFAULT_CATEGORY_ICON);
  }, [categoryId]);

  return (
    <Image
      src={src}
      alt={`${label} category icon`}
      width={20}
      height={20}
      className="h-5 w-5 flex-shrink-0"
      onError={() => {
        if (src !== DEFAULT_CATEGORY_ICON) {
          setSrc(DEFAULT_CATEGORY_ICON);
        }
      }}
    />
  );
};

type ApplicationsMenuProps = {
  activeCategory: string;
  onSelect: (id: string) => void;
  searchQuery?: string;
  view?: ApplicationsMenuView;
  metadata?: MetadataRecord;
  onResultsChange?: (apps: LauncherApp[]) => void;
};

const ApplicationsMenu: React.FC<ApplicationsMenuProps> = ({
  activeCategory,
  onSelect,
  searchQuery = '',
  view = 'all',
  metadata,
  onResultsChange,
}) => {
  const { currentApps } = useApplicationsMenuData({
    searchQuery,
    view,
    kaliCategory: activeCategory,
    metadata,
  });

  useEffect(() => {
    if (!onResultsChange) return;
    onResultsChange(currentApps);
  }, [currentApps, onResultsChange]);

  return (
    <nav aria-label="Kali application categories">
      <ul className="space-y-1">
        {KALI_CATEGORIES.map((category) => {
          const isActive = category.id === activeCategory;
          return (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => onSelect(category.id)}
                className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                  isActive ? 'bg-gray-700 text-white' : 'bg-transparent hover:bg-gray-700/60'
                }`}
                aria-pressed={isActive}
              >
                <CategoryIcon categoryId={category.id} label={category.label} />
                <span className="text-sm font-medium">{category.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default ApplicationsMenu;
