import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import type { MobileOverride, MobileOverrideMap } from '../types/mobile';
import {
  DEFAULT_MOBILE_DPI,
  MAX_MOBILE_DPI,
  MIN_MOBILE_DPI,
  ROTATION_OPTIONS,
} from '../types/mobile';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'kali-mobile');
const OVERRIDES_FILE = path.join(CONFIG_DIR, 'app-overrides.json');
const ROTATION_SET = new Set<number>(ROTATION_OPTIONS);

const clampDpi = (dpi: number): number => {
  const parsed = Number.isFinite(dpi) ? dpi : DEFAULT_MOBILE_DPI;
  const rounded = Math.round(parsed);
  return Math.min(MAX_MOBILE_DPI, Math.max(MIN_MOBILE_DPI, rounded));
};

const ensureConfigDir = async () => {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
};

const parseOverride = (value: unknown): MobileOverride | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<MobileOverride> & { [key: string]: unknown };
  const dpiValue = clampDpi(Number(candidate.dpi));
  const rotationValue = Number(candidate.rotation);
  const rotation = ROTATION_SET.has(rotationValue) ? rotationValue : 0;
  return { dpi: dpiValue, rotation };
};

const normaliseOverrides = (data: unknown): MobileOverrideMap => {
  if (!data || typeof data !== 'object') return {};
  const map: MobileOverrideMap = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof key !== 'string' || key.trim() === '') continue;
    const override = parseOverride(value);
    if (!override) continue;
    map[key] = override;
  }
  return map;
};

export const readMobileOverrides = async (): Promise<MobileOverrideMap> => {
  try {
    const buffer = await fs.readFile(OVERRIDES_FILE, 'utf-8');
    const parsed = JSON.parse(buffer) as unknown;
    return normaliseOverrides(parsed);
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return {};
    }
    throw err;
  }
};

const writeOverrides = async (overrides: MobileOverrideMap) => {
  await ensureConfigDir();
  const sortedEntries = Object.keys(overrides)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => [key, overrides[key]] as const);
  const sortedMap = Object.fromEntries(sortedEntries);
  await fs.writeFile(OVERRIDES_FILE, `${JSON.stringify(sortedMap, null, 2)}\n`, 'utf-8');
};

export const upsertMobileOverride = async (
  appId: string,
  override: MobileOverride,
): Promise<MobileOverrideMap> => {
  const trimmedId = appId.trim();
  if (!trimmedId) {
    throw new Error('App id is required');
  }
  const current = await readMobileOverrides();
  current[trimmedId] = {
    dpi: clampDpi(override.dpi),
    rotation: ROTATION_SET.has(override.rotation) ? override.rotation : 0,
  };
  await writeOverrides(current);
  return current;
};

export const removeMobileOverride = async (
  appId: string,
): Promise<MobileOverrideMap> => {
  const trimmedId = appId.trim();
  if (!trimmedId) {
    throw new Error('App id is required');
  }
  const current = await readMobileOverrides();
  if (trimmedId in current) {
    delete current[trimmedId];
    await writeOverrides(current);
  }
  return current;
};

export const MOBILE_OVERRIDES_PATH = OVERRIDES_FILE;
