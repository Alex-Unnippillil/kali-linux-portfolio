export type CategorySource =
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'recent' }
  | { type: 'ids'; appIds: readonly string[] };

export type CategoryDefinition = {
  id: string;
  label: string;
  icon: string;
} & CategorySource;

export type CategoryConfig<T> = CategoryDefinition & { apps: T[] };

export const CATEGORY_DEFINITIONS = [
  {
    id: 'all',
    label: 'All Applications',
    icon: '/themes/Yaru/system/view-app-grid-symbolic.svg',
    type: 'all',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: '/themes/Yaru/status/projects.svg',
    type: 'favorites',
  },
  {
    id: 'recent',
    label: 'Recent',
    icon: '/themes/Yaru/status/process-working-symbolic.svg',
    type: 'recent',
  },
  {
    id: 'information-gathering',
    label: 'Information Gathering',
    icon: '/themes/Yaru/apps/radar-symbolic.svg',
    type: 'ids',
    appIds: ['nmap-nse', 'reconng', 'kismet', 'wireshark'],
  },
  {
    id: 'vulnerability-analysis',
    label: 'Vulnerability Analysis',
    icon: '/themes/Yaru/apps/nessus.svg',
    type: 'ids',
    appIds: ['nessus', 'openvas', 'nikto'],
  },
  {
    id: 'web-app-analysis',
    label: 'Web App Analysis',
    icon: '/themes/Yaru/apps/http.svg',
    type: 'ids',
    appIds: ['http', 'beef', 'metasploit'],
  },
  {
    id: 'password-attacks',
    label: 'Password Attacks',
    icon: '/themes/Yaru/apps/john.svg',
    type: 'ids',
    appIds: ['john', 'hashcat', 'hydra'],
  },
  {
    id: 'wireless-attacks',
    label: 'Wireless Attacks',
    icon: '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg',
    type: 'ids',
    appIds: ['kismet', 'reaver', 'wireshark'],
  },
  {
    id: 'exploitation-tools',
    label: 'Exploitation Tools',
    icon: '/themes/Yaru/apps/metasploit.svg',
    type: 'ids',
    appIds: ['metasploit', 'security-tools', 'beef'],
  },
  {
    id: 'sniffing-spoofing',
    label: 'Sniffing & Spoofing',
    icon: '/themes/Yaru/apps/ettercap.svg',
    type: 'ids',
    appIds: ['dsniff', 'ettercap', 'wireshark'],
  },
  {
    id: 'post-exploitation',
    label: 'Post Exploitation',
    icon: '/themes/Yaru/apps/msf-post.svg',
    type: 'ids',
    appIds: ['msf-post', 'mimikatz', 'volatility'],
  },
  {
    id: 'forensics-reporting',
    label: 'Forensics & Reporting',
    icon: '/themes/Yaru/apps/autopsy.svg',
    type: 'ids',
    appIds: ['autopsy', 'evidence-vault', 'project-gallery'],
  },
] as const satisfies readonly CategoryDefinition[];

const CATEGORY_ID_SET = new Set(CATEGORY_DEFINITIONS.map((category) => category.id));

export const isCategoryId = (
  value: string,
): value is CategoryDefinition['id'] => CATEGORY_ID_SET.has(value);

export const buildCategoryConfigs = <T extends { id: string; favourite?: boolean; disabled?: boolean }>(
  apps: readonly T[],
  options: {
    favoriteIds?: readonly string[];
    recentIds?: readonly string[];
  } = {},
): CategoryConfig<T>[] => {
  const mapById = new Map(apps.map((app) => [app.id, app] as const));
  const fallbackFavorites = apps
    .filter((app) => Boolean(app.favourite))
    .map((app) => app.id);
  const favoriteIds =
    options.favoriteIds && options.favoriteIds.length > 0
      ? Array.from(options.favoriteIds)
      : fallbackFavorites;
  const favoritesSet = new Set(favoriteIds);
  const recentIds = options.recentIds ? Array.from(options.recentIds) : [];

  return CATEGORY_DEFINITIONS.map((definition) => {
    let appsForCategory: T[] = [];
    switch (definition.type) {
      case 'all':
        appsForCategory = apps.filter((app) => !app.disabled);
        break;
      case 'favorites':
        appsForCategory = apps.filter((app) => favoritesSet.has(app.id));
        break;
      case 'recent':
        appsForCategory = recentIds
          .map((appId) => mapById.get(appId))
          .filter((app): app is T => Boolean(app));
        break;
      case 'ids':
        appsForCategory = (definition.appIds ?? [])
          .map((appId) => mapById.get(appId))
          .filter((app): app is T => Boolean(app));
        break;
      default:
        appsForCategory = apps;
    }
    return {
      ...definition,
      apps: appsForCategory,
    };
  });
};
