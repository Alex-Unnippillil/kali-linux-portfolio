import { toggleReduceMotionPreference, toggleThemePreference } from '../utils/systemSettings';

export interface CommandDefinition {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  keywords?: string[];
  section?: string;
  priority?: number;
  run: () => void;
}

export interface CommandRegistryContext {
  openApp: (id: string) => void;
  openShortcutSelector: () => void;
}

export interface RegistryApp {
  id: string;
  title: string;
  icon?: string;
  disabled?: boolean;
}

const normalizeIdentifier = (value: string) => value.replace(/[-_]/g, ' ');

export const createCommandRegistry = (
  context: CommandRegistryContext,
  appEntries: readonly RegistryApp[],
): CommandDefinition[] => {
  const apps = new Map<string, RegistryApp>();
  appEntries.forEach((app) => {
    if (!app?.id || apps.has(app.id)) return;
    apps.set(app.id, app);
  });

  const getAppIcon = (id: string) => apps.get(id)?.icon;

  const baseCommands: CommandDefinition[] = [
    {
      id: 'command:open-terminal',
      label: 'Open Terminal',
      description: 'Launch the Kali terminal',
      icon: getAppIcon('terminal'),
      keywords: ['terminal', 'shell', 'cli', 'console'],
      section: 'Commands',
      priority: 120,
      run: () => context.openApp('terminal'),
    },
    {
      id: 'command:open-settings',
      label: 'Open Settings',
      description: 'Adjust system preferences',
      icon: getAppIcon('settings'),
      keywords: ['settings', 'preferences', 'options'],
      section: 'Commands',
      priority: 115,
      run: () => context.openApp('settings'),
    },
    {
      id: 'command:toggle-theme',
      label: 'Toggle theme',
      description: 'Switch between light and dark modes',
      keywords: ['theme', 'appearance', 'dark', 'light'],
      section: 'Commands',
      priority: 110,
      run: toggleThemePreference,
    },
    {
      id: 'command:toggle-reduce-motion',
      label: 'Toggle reduced motion',
      description: 'Enable or disable interface animations',
      keywords: ['animation', 'motion', 'accessibility'],
      section: 'Commands',
      priority: 105,
      run: toggleReduceMotionPreference,
    },
    {
      id: 'command:add-desktop-shortcut',
      label: 'Add desktop shortcut',
      description: 'Open the shortcut selector to pin apps',
      keywords: ['desktop', 'shortcut', 'pin'],
      section: 'Commands',
      priority: 100,
      run: context.openShortcutSelector,
    },
  ];

  const appCommands: CommandDefinition[] = Array.from(apps.values())
    .filter((app) => !app.disabled)
    .map((app) => ({
      id: `app:${app.id}`,
      label: app.title,
      description: 'Launch application',
      icon: app.icon,
      keywords: [normalizeIdentifier(app.id), app.title],
      section: 'Applications',
      priority: 10,
      run: () => context.openApp(app.id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return [...baseCommands, ...appCommands];
};

export default createCommandRegistry;
