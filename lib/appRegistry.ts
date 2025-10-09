export type AppMetadata = {
  title: string;
  description: string;
  path: string;
  keyboard: string[];
  keywords: string[];
  icon?: string;
};

export type AppEntry = {
  id: string;
  title: string;
  icon?: string;
  disabled?: boolean;
};

const DEFAULT_KEYBOARD_HINTS = [
  'Enter — Launch app',
  'Ctrl+, — Open settings',
  'Alt+Tab — Switch apps',
];

const metadataOverrides: Partial<Record<string, Partial<AppMetadata>>> = {
  terminal: {
    description: 'Simulated shell with offline commands and command history.',
    keyboard: [
      'Enter — Execute command',
      'Ctrl+L — Clear terminal output',
      'Arrow keys — Navigate history',
    ],
    keywords: ['shell', 'cli', 'command line', 'bash', 'zsh'],
  },
  firefox: {
    description: 'Lightweight Firefox-inspired web view that loads a single sandboxed iframe.',
    keyboard: ['Ctrl+L — Focus address bar', 'Enter — Navigate to URL'],
    keywords: ['browser', 'firefox', 'web'],
  },
  vscode: {
    description: 'VS Code remote workspace embedded via StackBlitz iframe for quick code editing.',
    keyboard: [
      'Ctrl+P — Quick open files',
      'Ctrl+Shift+P — Command palette',
      'Ctrl+B — Toggle sidebar',
    ],
    keywords: ['code editor', 'ide', 'development'],
  },
  spotify: {
    description: 'Spotify-inspired player that streams curated demo playlists without external calls.',
    keyboard: [
      'Space — Play or pause',
      'ArrowRight — Skip forward',
      'ArrowLeft — Skip backward',
    ],
    keywords: ['music', 'audio', 'playlist', 'spotify'],
  },
  settings: {
    description: 'Desktop settings hub with themes, key bindings, and personalization options.',
    keywords: ['preferences', 'theme', 'configuration'],
  },
  'security-tools': {
    description: 'Unified console aggregating repeater, log viewers, and lab-only detection fixtures.',
    keyboard: [
      'Ctrl+F — Focus global search',
      'Tab — Cycle tool tabs',
      'Esc — Close overlays',
    ],
    keywords: ['pentest', 'security', 'forensics', 'toolkit'],
  },
  wireshark: {
    description: 'Packet capture viewer using bundled PCAP fixtures to demonstrate network analysis.',
    keywords: ['packet', 'sniffer', 'network analysis', 'pcap'],
  },
  metasploit: {
    description: 'Module browser and log replay of the Metasploit framework for safe demonstrations.',
    keywords: ['exploit', 'framework', 'penetration testing'],
  },
  weather: {
    description: 'Weather dashboard showing forecast data sourced from static fixtures.',
    keywords: ['forecast', 'temperature', 'climate'],
  },
  'mimikatz/offline': {
    description: 'Offline walkthrough of mimikatz credential extraction stages with canned data.',
    keywords: ['mimikatz', 'credentials', 'security demo'],
  },
};

export const buildAppMetadata = (app: AppEntry): AppMetadata => {
  const override = metadataOverrides[app.id] ?? {};
  return {
    title: app.title,
    icon: app.icon,
    description:
      override.description ?? `Launch the ${app.title} demo environment.`,
    path: override.path ?? `/apps/${app.id}`,
    keyboard: override.keyboard ?? DEFAULT_KEYBOARD_HINTS,
    keywords: override.keywords ?? [],
  };
};

export const createRegistryMap = (apps: AppEntry[]): Record<string, AppMetadata> =>
  apps.reduce<Record<string, AppMetadata>>((acc, app) => {
    acc[app.id] = buildAppMetadata(app);
    return acc;
  }, {});

export const loadAppRegistry = async () => {
  const mod = await import('../apps.config');
  const list: AppEntry[] = Array.isArray(mod.default) ? mod.default : [];
  return {
    apps: list,
    metadata: createRegistryMap(list),
  };
};

export const defaultKeyboardHints = DEFAULT_KEYBOARD_HINTS;
