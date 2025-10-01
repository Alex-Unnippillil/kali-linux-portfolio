import type { SearchableItem } from './commandPaletteSearch';

type PaletteAction =
  | { type: 'open-app'; target: string }
  | { type: 'navigate'; target: string }
  | { type: 'callback'; fn: () => void };

export type PaletteItem = SearchableItem & {
  icon?: string;
  group: 'app' | 'command' | 'help';
  action: PaletteAction;
};

const createKeywordSet = (values: (string | undefined)[]) =>
  values
    .flatMap((value) =>
      value
        ? value
            .split(/[\s/\-]+/)
            .map((part) => part.trim())
            .filter(Boolean)
        : [],
    )
    .filter(Boolean);

export const loadCommandPaletteItems = async (): Promise<PaletteItem[]> => {
  const [{ default: appList = [], games = [] }, { buildAppMetadata }] = await Promise.all([
    import('../apps.config'),
    import('../lib/appRegistry'),
  ]);

  const entries = [...(Array.isArray(appList) ? appList : []), ...(Array.isArray(games) ? games : [])]
    .filter((entry) => !entry.disabled);

  const items: PaletteItem[] = entries.map((entry) => {
    const metadata = buildAppMetadata({ id: entry.id, title: entry.title, icon: entry.icon });
    const keywords = createKeywordSet([
      entry.id,
      entry.title,
      metadata.description,
      ...(metadata.keyboard ?? []),
    ]);
    return {
      id: entry.id,
      title: metadata.title,
      description: metadata.description,
      icon: entry.icon,
      keywords,
      group: 'app',
      action: { type: 'open-app', target: entry.id },
    };
  });

  const settingsIcon = items.find((item) => item.id === 'settings')?.icon;

  const extraItems: PaletteItem[] = [
    {
      id: 'command-settings',
      title: 'Open Settings',
      description: 'Adjust desktop preferences, themes, and accessibility options.',
      icon: settingsIcon,
      keywords: ['settings', 'preferences', 'theme', 'accessibility', 'control', 'config'],
      group: 'command',
      action: { type: 'open-app', target: 'settings' },
    },
    {
      id: 'command-help-keyboard',
      title: 'Keyboard Reference',
      description: 'View keyboard shortcuts and desktop navigation tips.',
      keywords: ['help', 'shortcuts', 'keyboard', 'reference', 'documentation'],
      group: 'help',
      action: { type: 'navigate', target: '/keyboard-reference' },
    },
  ];

  const seen = new Set<string>();
  const combined = [...items, ...extraItems].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return combined.sort((a, b) => a.title.localeCompare(b.title));
};

export type { PaletteAction };
