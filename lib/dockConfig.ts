import { promises as fs } from 'fs';
import path from 'path';

export interface DockConfig {
  pinned: string[];
}

export interface DockConfigUpdate {
  pinned?: unknown;
}

const DOCK_CONFIG_PATH = path.join(process.cwd(), 'data', 'dock-config.json');
const DEFAULT_DOCK_CONFIG: DockConfig = {
  pinned: ['chrome', 'terminal', 'vscode', 'x', 'spotify', 'youtube', 'about', 'settings'],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function sanitizePinned(
  value: unknown,
  fallback: string[],
  strict: boolean,
): string[] {
  if (!Array.isArray(value)) {
    if (strict) {
      throw new Error('Dock config update must include an array of application ids in "pinned".');
    }
    return [...fallback];
  }

  const sanitized: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') {
      if (strict) {
        throw new Error('Dock config pinned list may only contain string application ids.');
      }
      continue;
    }
    const id = entry.trim();
    if (!id) {
      if (strict) {
        throw new Error('Dock config pinned list may not include empty identifiers.');
      }
      continue;
    }
    if (!sanitized.includes(id)) {
      sanitized.push(id);
    }
  }
  return sanitized;
}

export function resolveDockConfig(
  base: DockConfig,
  update: unknown,
  { strict = false }: { strict?: boolean } = {},
): DockConfig {
  if (!isRecord(update)) {
    if (strict) {
      throw new Error('Dock config update must be an object.');
    }
    return { pinned: [...base.pinned] };
  }

  const result: DockConfig = { pinned: [...base.pinned] };
  if (Object.prototype.hasOwnProperty.call(update, 'pinned')) {
    result.pinned = sanitizePinned(update.pinned, base.pinned, strict);
  }
  return result;
}

export async function readDockConfig(): Promise<DockConfig> {
  try {
    const raw = await fs.readFile(DOCK_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return resolveDockConfig(DEFAULT_DOCK_CONFIG, parsed, { strict: false });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      await writeDockConfig(DEFAULT_DOCK_CONFIG);
      return { ...DEFAULT_DOCK_CONFIG, pinned: [...DEFAULT_DOCK_CONFIG.pinned] };
    }
    console.warn('Failed to load dock config; using defaults.', error);
    return { ...DEFAULT_DOCK_CONFIG, pinned: [...DEFAULT_DOCK_CONFIG.pinned] };
  }
}

export async function writeDockConfig(config: DockConfig): Promise<DockConfig> {
  const normalized = resolveDockConfig(DEFAULT_DOCK_CONFIG, config, { strict: true });
  await fs.mkdir(path.dirname(DOCK_CONFIG_PATH), { recursive: true });
  await fs.writeFile(
    DOCK_CONFIG_PATH,
    `${JSON.stringify(normalized, null, 2)}\n`,
    'utf8',
  );
  return normalized;
}

export { DEFAULT_DOCK_CONFIG };
