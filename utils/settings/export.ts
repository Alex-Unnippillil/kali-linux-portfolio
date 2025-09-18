import {
  applySettingsSnapshot,
  BaselineSnapshot,
  captureBaselineSnapshot,
  diffSettings,
  ensureBaselineSnapshot,
  getSettingsSnapshot,
  normalizeSettingsSnapshot,
  SettingsDifference,
  SettingsSnapshot,
  setBaselineSnapshot,
} from './index';

const resolveWindow = (): Window | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  const candidate = Reflect.get(globalThis, 'window') as Window | undefined;
  return typeof candidate === 'object' ? candidate : undefined;
};

const hasWindow = (): boolean => typeof resolveWindow() !== 'undefined';

export const SETTINGS_EXPORT_VERSION = 1;

const PROFILE_ID_KEY = 'settings:profile:id';
const PROFILE_LABEL_KEY = 'settings:profile:label';

export interface SettingsProfileMetadata {
  id: string;
  label: string;
  host?: string;
}

export interface SettingsExportPayload {
  version: number;
  exportedAt: string;
  profile: SettingsProfileMetadata;
  settings: SettingsSnapshot;
}

export interface ImportOptions {
  dryRun?: boolean;
  baseline?: BaselineSnapshot | null;
}

export interface ImportResult {
  payload: SettingsExportPayload;
  baseline: BaselineSnapshot;
  differences: SettingsDifference[];
  applied: boolean;
}

const defaultProfile: SettingsProfileMetadata = {
  id: 'default',
  label: 'Local Profile',
};

const safeProfileValue = (key: string): string | null => {
  const win = resolveWindow();
  if (!win) return null;
  try {
    return win.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const buildProfileMetadata = (): SettingsProfileMetadata => {
  const id = safeProfileValue(PROFILE_ID_KEY) ?? defaultProfile.id;
  const label = safeProfileValue(PROFILE_LABEL_KEY) ?? defaultProfile.label;
  const host = hasWindow() ? resolveWindow()?.location?.host : undefined;
  return { id, label, host };
};

export const createExportPayload = async (): Promise<SettingsExportPayload> => {
  const settings = await getSettingsSnapshot();
  return {
    version: SETTINGS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    profile: buildProfileMetadata(),
    settings,
  };
};

export const exportSettings = async (): Promise<string> => {
  const payload = await createExportPayload();
  return JSON.stringify(payload, null, 2);
};

const assertObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export const parseSettingsExport = (
  input: string | unknown,
): SettingsExportPayload => {
  const parsed =
    typeof input === 'string'
      ? (() => {
          try {
            return JSON.parse(input) as unknown;
          } catch (error) {
            throw new Error('Unable to parse settings file.');
          }
        })()
      : input;

  if (!assertObject(parsed)) {
    throw new Error('Settings payload must be an object.');
  }

  const { version, exportedAt, profile, settings } = parsed as Record<string, unknown>;

  if (typeof version !== 'number') {
    throw new Error('Settings payload missing version metadata.');
  }

  if (version !== SETTINGS_EXPORT_VERSION) {
    throw new Error(`Unsupported settings version ${version}.`);
  }

  if (!assertObject(settings)) {
    throw new Error('Settings payload missing settings data.');
  }

  const normalizedSettings = normalizeSettingsSnapshot(settings as Partial<SettingsSnapshot>);

  let profileMetadata: SettingsProfileMetadata = buildProfileMetadata();
  if (assertObject(profile)) {
    profileMetadata = {
      id: typeof profile.id === 'string' ? profile.id : profileMetadata.id,
      label:
        typeof profile.label === 'string' ? profile.label : profileMetadata.label,
      host:
        typeof profile.host === 'string' ? profile.host : profileMetadata.host,
    };
  }

  return {
    version: SETTINGS_EXPORT_VERSION,
    exportedAt:
      typeof exportedAt === 'string' ? exportedAt : new Date().toISOString(),
    profile: profileMetadata,
    settings: normalizedSettings,
  };
};

export const importSettings = async (
  input: string | SettingsExportPayload,
  options: ImportOptions = {},
): Promise<ImportResult> => {
  const payload =
    typeof input === 'string' ? parseSettingsExport(input) : input;

  let baseline: BaselineSnapshot | null = options.baseline ?? null;
  if (!baseline) {
    baseline = options.dryRun
      ? await ensureBaselineSnapshot()
      : await captureBaselineSnapshot({ force: true });
  } else if (!options.dryRun) {
    setBaselineSnapshot(baseline);
  }

  if (!baseline) {
    baseline = {
      capturedAt: new Date().toISOString(),
      settings: await getSettingsSnapshot(),
    };
  }

  const differences = diffSettings(baseline.settings, payload.settings);

  if (!options.dryRun) {
    await applySettingsSnapshot(payload.settings);
  }

  return {
    payload,
    baseline,
    differences,
    applied: !options.dryRun,
  };
};

export const hasConflicts = (result: Pick<ImportResult, 'differences'>): boolean =>
  result.differences.length > 0;
