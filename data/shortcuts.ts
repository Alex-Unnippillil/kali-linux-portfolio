export interface ShortcutDefinition {
  description: string;
  keys: string;
  category: string;
  tags?: string[];
}

export const DEFAULT_SHORTCUTS: readonly ShortcutDefinition[] = [
  {
    description: 'Show keyboard shortcuts',
    keys: '?',
    category: 'General',
    tags: ['help', 'reference', 'overlay'],
  },
  {
    description: 'Open settings',
    keys: 'Ctrl+,',
    category: 'General',
    tags: ['preferences', 'configuration'],
  },
  {
    description: 'Toggle app launcher',
    keys: 'Meta',
    category: 'General',
    tags: ['launcher', 'start menu', 'whisker'],
  },
  {
    description: 'Open clipboard manager',
    keys: 'Ctrl+Shift+V',
    category: 'Utilities',
    tags: ['clipboard', 'paste history'],
  },
  {
    description: 'Open context menu',
    keys: 'Shift+F10',
    category: 'Utilities',
    tags: ['menu', 'accessibility'],
  },
  {
    description: 'Switch between windows',
    keys: 'Alt+Tab',
    category: 'Window management',
    tags: ['task switcher', 'next window'],
  },
  {
    description: 'Switch to previous window',
    keys: 'Alt+Shift+Tab',
    category: 'Window management',
    tags: ['task switcher', 'previous window'],
  },
  {
    description: 'Cycle windows of focused app',
    keys: "Alt+`",
    category: 'Window management',
    tags: ['tilde', 'same app windows'],
  },
  {
    description: 'Snap window left',
    keys: 'Meta+ArrowLeft',
    category: 'Window management',
    tags: ['snap', 'tile'],
  },
  {
    description: 'Snap window right',
    keys: 'Meta+ArrowRight',
    category: 'Window management',
    tags: ['snap', 'tile'],
  },
  {
    description: 'Snap window up',
    keys: 'Meta+ArrowUp',
    category: 'Window management',
    tags: ['snap', 'tile'],
  },
  {
    description: 'Snap window down',
    keys: 'Meta+ArrowDown',
    category: 'Window management',
    tags: ['snap', 'tile'],
  },
  {
    description: 'Move to workspace on the left',
    keys: 'Ctrl+Alt+ArrowLeft',
    category: 'Workspaces',
    tags: ['workspace', 'multi-desktop', 'left'],
  },
  {
    description: 'Move to workspace on the right',
    keys: 'Ctrl+Alt+ArrowRight',
    category: 'Workspaces',
    tags: ['workspace', 'multi-desktop', 'right'],
  },
  {
    description: 'Move to workspace above',
    keys: 'Ctrl+Alt+ArrowUp',
    category: 'Workspaces',
    tags: ['workspace', 'multi-desktop', 'up'],
  },
  {
    description: 'Move to workspace below',
    keys: 'Ctrl+Alt+ArrowDown',
    category: 'Workspaces',
    tags: ['workspace', 'multi-desktop', 'down'],
  },
] as const;

export const SHORTCUT_DEFINITION_MAP: ReadonlyMap<string, ShortcutDefinition> =
  new Map(DEFAULT_SHORTCUTS.map((shortcut) => [shortcut.description, shortcut]));

export const SHORTCUT_CATEGORIES: readonly string[] = Array.from(
  new Set(DEFAULT_SHORTCUTS.map((shortcut) => shortcut.category))
);
