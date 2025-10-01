export type ShortcutPlatform = 'mac' | 'windows' | 'linux';

export interface ShortcutDefinition {
  id: string;
  description: string;
  category: string;
  command?: string;
  keywords?: string[];
  bindings: Record<ShortcutPlatform, string>;
}

interface ShortcutSection {
  id: string;
  title: string;
  shortcuts: ShortcutDefinition[];
}

const createBindings = (
  mac: string,
  windows: string,
  linux: string = windows
): Record<ShortcutPlatform, string> => ({ mac, windows, linux });

export const SHORTCUT_SECTIONS: ShortcutSection[] = [
  {
    id: 'global',
    title: 'Global',
    shortcuts: [
      {
        id: 'shortcuts.open',
        description: 'Show keyboard shortcuts',
        category: 'Global',
        command: 'shortcuts:open',
        keywords: ['help', 'keyboard', 'reference'],
        bindings: createBindings('Meta+/', 'Ctrl+/', 'Ctrl+/'),
      },
      {
        id: 'settings.open',
        description: 'Open settings',
        category: 'Global',
        command: 'settings:open',
        keywords: ['preferences'],
        bindings: createBindings('Meta+,', 'Ctrl+,', 'Ctrl+,'),
      },
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation',
    shortcuts: [
      {
        id: 'launcher.toggle',
        description: 'Toggle app launcher',
        category: 'Navigation',
        command: 'launcher:toggle',
        keywords: ['menu', 'start', 'apps'],
        bindings: createBindings('Meta+Space', 'Ctrl+Space', 'Ctrl+Space'),
      },
      {
        id: 'windows.show-desktop',
        description: 'Show desktop',
        category: 'Navigation',
        command: 'windows:show-desktop',
        keywords: ['minimize', 'windows'],
        bindings: createBindings('F11', 'Win+D', 'Super+D'),
      },
    ],
  },
  {
    id: 'system',
    title: 'System',
    shortcuts: [
      {
        id: 'system.search',
        description: 'Search portfolio',
        category: 'System',
        command: 'system:search',
        keywords: ['find', 'lookup'],
        bindings: createBindings('Meta+K', 'Ctrl+K', 'Ctrl+K'),
      },
    ],
  },
];

export const ALL_SHORTCUTS: (ShortcutDefinition & { section: string })[] =
  SHORTCUT_SECTIONS.flatMap((section) =>
    section.shortcuts.map((shortcut) => ({ ...shortcut, section: section.title }))
  );

export const SHORTCUT_LOOKUP = new Map<string, ShortcutDefinition & { section: string }>(
  ALL_SHORTCUTS.map((shortcut) => [shortcut.id, shortcut])
);

export const SHORTCUT_TRIGGER_ID = 'shortcuts.open';

export const PLATFORM_LABELS: Record<ShortcutPlatform, string> = {
  mac: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

export const ORDERED_PLATFORMS: ShortcutPlatform[] = ['mac', 'windows', 'linux'];

export const getBindingsForPlatform = (
  shortcut: ShortcutDefinition,
  platform: ShortcutPlatform
): string => shortcut.bindings[platform];

export const getDefaultBinding = (shortcut: ShortcutDefinition): string => {
  return shortcut.bindings.windows;
};
