import { z } from 'zod';

export type AppMetadata = {
  title: string;
  description: string;
  path: string;
  keyboard: string[];
  icon?: string;
};

type AppEntry = {
  id: string;
  title: string;
  icon?: string;
};

type MetadataOverride = Partial<
  Pick<AppMetadata, 'title' | 'description' | 'path' | 'keyboard' | 'icon'>
>;

const appEntrySchema = z.object({
  id: z
    .string({ required_error: 'App entry is missing an id' })
    .min(1, 'App entry id cannot be empty'),
  title: z
    .string({ required_error: 'App entry is missing a title' })
    .min(1, 'App entry title cannot be empty'),
  icon: z
    .string({ invalid_type_error: 'App entry icon must be a string' })
    .min(1, 'App entry icon cannot be empty')
    .optional(),
});

const appRegistrySchema = z.array(appEntrySchema, {
  invalid_type_error: 'App registry must be an array of app entries',
});

const metadataOverrideSchema: z.ZodType<MetadataOverride> = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  path: z.string().optional(),
  keyboard: z.array(z.string()).optional(),
  icon: z.string().optional(),
});

const metadataOverridesSchema = z.record(metadataOverrideSchema);

const DEFAULT_KEYBOARD_HINTS = [
  'Enter — Launch app',
  'Ctrl+, — Open settings',
  'Alt+Tab — Switch apps',
];

const metadataOverrides = metadataOverridesSchema.parse({
  terminal: {
    description: 'Simulated shell with offline commands and command history.',
    keyboard: [
      'Enter — Execute command',
      'Ctrl+L — Clear terminal output',
      'Arrow keys — Navigate history',
    ],
  },
  firefox: {
    description: 'Lightweight Firefox-inspired web view that loads a single sandboxed iframe.',
    keyboard: ['Ctrl+L — Focus address bar', 'Enter — Navigate to URL'],
  },
  vscode: {
    description: 'VS Code remote workspace embedded via StackBlitz iframe for quick code editing.',
    keyboard: [
      'Ctrl+P — Quick open files',
      'Ctrl+Shift+P — Command palette',
      'Ctrl+B — Toggle sidebar',
    ],
  },
  spotify: {
    description: 'Embedded Spotify playlist featuring a curated synthwave mix inside the Kali desktop window.',
  },
  settings: {
    description: 'Desktop settings hub with themes, key bindings, and personalization options.',
  },
  'security-tools': {
    description: 'Unified console aggregating repeater, log viewers, and lab-only detection fixtures.',
    keyboard: [
      'Ctrl+F — Focus global search',
      'Tab — Cycle tool tabs',
      'Esc — Close overlays',
    ],
  },
  wireshark: {
    description: 'Packet capture viewer using bundled PCAP fixtures to demonstrate network analysis.',
  },
  metasploit: {
    description: 'Module browser and log replay of the Metasploit framework for safe demonstrations.',
  },
  weather: {
    description: 'Weather dashboard showing forecast data sourced from static fixtures.',
  },
  'mimikatz/offline': {
    description: 'Offline walkthrough of mimikatz credential extraction stages with canned data.',
  },
});

export const parseRegistryEntries = (input: unknown): AppEntry[] => {
  const result = appRegistrySchema.safeParse(input);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => {
        const path = issue.path.length ? issue.path.join('.') : 'entry';
        return `${path}: ${issue.message}`;
      })
      .join('; ');

    const errorMessage = `Invalid app registry configuration: ${details}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  return result.data;
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
  };
};

export const createRegistryMap = (apps: AppEntry[]): Record<string, AppMetadata> =>
  apps.reduce<Record<string, AppMetadata>>((acc, app) => {
    acc[app.id] = buildAppMetadata(app);
    return acc;
  }, {});

export const loadAppRegistry = async () => {
  const mod = await import('../apps.config');
  const list = parseRegistryEntries(mod?.default);

  return {
    apps: list,
    metadata: createRegistryMap(list),
  };
};

export const defaultKeyboardHints = DEFAULT_KEYBOARD_HINTS;
