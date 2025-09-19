import { loadProfiles, SavedProfile } from '../utils/bleProfiles';

export type DataExportStage = 'profiles' | 'sessions' | 'flags';

export const DATA_EXPORT_STAGES: DataExportStage[] = [
  'profiles',
  'sessions',
  'flags',
];

const SESSION_KEYS = ['desktop-session', 'hydra/session', 'openvas/session'] as const;

const FLAG_KEYS = [
  'app:theme',
  'density',
  'font-scale',
  'reduced-motion',
  'high-contrast',
  'large-hit-areas',
  'pong-spin',
  'allow-network',
  'haptics',
  'snap-enabled',
  'reaver-router-profile',
] as const;

type SessionKey = (typeof SESSION_KEYS)[number];
type FlagKey = (typeof FLAG_KEYS)[number];

type LocalStorageKey = SessionKey | FlagKey;

type DataSource = 'localStorage' | 'opfs';

export interface ExportItem<T = unknown> {
  key: string;
  size: number;
  source: DataSource;
  data: T;
  raw: string;
}

export interface ExportSection<T = unknown> {
  items: ExportItem<T>[];
  totalSize: number;
}

export interface DataExportArchive {
  generatedAt: string;
  totals: {
    bytes: number;
    counts: Record<DataExportStage, number>;
  };
  sections: {
    profiles: ExportSection<SavedProfile>;
    sessions: ExportSection<unknown>;
    flags: ExportSection<unknown>;
  };
}

export interface StageSummary {
  items: number;
  bytes: number;
}

export type StageCallback = (stage: DataExportStage, summary: StageSummary) => void;

export interface DataExportOptions {
  storage?: Storage;
  profileLoader?: () => Promise<SavedProfile[]>;
  now?: () => Date;
  onStageComplete?: StageCallback;
}

export interface DataExportWorkerRequest {
  type: 'start';
  requestId?: string;
}

export interface DataExportWorkerProgressEvent {
  type: 'progress';
  stage: DataExportStage;
  completed: number;
  total: number;
  items: number;
  bytes: number;
  requestId?: string;
}

export interface DataExportWorkerCompleteEvent {
  type: 'complete';
  archive: DataExportArchive;
  buffer: ArrayBuffer;
  bytes: number;
  mime: string;
  suggestedName: string;
  requestId?: string;
}

export interface DataExportWorkerErrorEvent {
  type: 'error';
  error: string;
  requestId?: string;
}

export type DataExportWorkerEvent =
  | DataExportWorkerProgressEvent
  | DataExportWorkerCompleteEvent
  | DataExportWorkerErrorEvent;

export const DATA_EXPORT_DEFAULT_MIME = 'application/json';

const encoder = new TextEncoder();

const getDefaultStorage = (): Storage | undefined => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage as Storage;
  }
  return undefined;
};

const parseValue = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const buildLocalStorageItems = (
  keys: readonly LocalStorageKey[],
  storage?: Storage,
): ExportItem[] => {
  if (!storage) return [];
  const items: ExportItem[] = [];
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (raw === null) continue;
    items.push({
      key,
      raw,
      data: parseValue(raw),
      size: encoder.encode(raw).byteLength,
      source: 'localStorage',
    });
  }
  return items.sort((a, b) => a.key.localeCompare(b.key));
};

const buildProfiles = async (
  loader: () => Promise<SavedProfile[]>,
): Promise<ExportItem<SavedProfile>[]> => {
  const profiles = await loader();
  return profiles
    .map((profile) => {
      const raw = JSON.stringify(profile);
      return {
        key: profile.deviceId,
        raw,
        data: profile,
        size: encoder.encode(raw).byteLength,
        source: 'opfs' as const,
      } satisfies ExportItem<SavedProfile>;
    })
    .sort((a, b) => a.key.localeCompare(b.key));
};

const buildSection = <T,>(items: ExportItem<T>[]): ExportSection<T> => ({
  items,
  totalSize: items.reduce((acc, item) => acc + item.size, 0),
});

export const gatherDataExport = async (
  options: DataExportOptions = {},
): Promise<DataExportArchive> => {
  const storage = options.storage ?? getDefaultStorage();
  const profileLoader = options.profileLoader ?? loadProfiles;
  const now = options.now ?? (() => new Date());

  const profiles = buildSection(await buildProfiles(profileLoader));
  options.onStageComplete?.('profiles', {
    items: profiles.items.length,
    bytes: profiles.totalSize,
  });

  const sessions = buildSection(buildLocalStorageItems(SESSION_KEYS, storage));
  options.onStageComplete?.('sessions', {
    items: sessions.items.length,
    bytes: sessions.totalSize,
  });

  const flags = buildSection(buildLocalStorageItems(FLAG_KEYS, storage));
  options.onStageComplete?.('flags', {
    items: flags.items.length,
    bytes: flags.totalSize,
  });

  const totalBytes = profiles.totalSize + sessions.totalSize + flags.totalSize;

  return {
    generatedAt: now().toISOString(),
    totals: {
      bytes: totalBytes,
      counts: {
        profiles: profiles.items.length,
        sessions: sessions.items.length,
        flags: flags.items.length,
      },
    },
    sections: {
      profiles,
      sessions,
      flags,
    },
  };
};

export const serializeArchive = (archive: DataExportArchive): Uint8Array => {
  const json = JSON.stringify(archive, null, 2);
  return encoder.encode(json);
};

export const toArrayBuffer = (view: Uint8Array): ArrayBuffer => {
  if (view.byteOffset === 0 && view.byteLength === view.buffer.byteLength) {
    return view.buffer;
  }
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
};

export const formatExportFileName = (date: Date | string = new Date()): string => {
  const value = typeof date === 'string' ? new Date(date) : date;
  const safe = value.toISOString().replace(/[:.]/g, '-');
  return `kali-portfolio-export-${safe}.json`;
};

export const __TEST__ = {
  SESSION_KEYS,
  FLAG_KEYS,
};
