import appsCatalog from '../apps.config';
import { createLogger, type Logger } from './logger';
import { safeLocalStorage } from '../utils/safeStorage';

const DEFAULT_CANDIDATE_APPS = ['calculator', 'terminal', 'quote', 'figlet'];
const DEFAULT_HEAVY_APPS = [
  'terminal',
  'metasploit',
  'wireshark',
  'hashcat',
  'autopsy',
  'radare2',
  'volatility',
  'openvas',
  'mimikatz',
  'screen-recorder',
  'msf-post',
  'nessus',
  'reaver',
  'recon-ng',
  'john',
];
const SAFE_MODE_STORAGE_KEYS = ['desktop-safe-mode', 'safe-mode'];

const TRUE_VALUES = new Set(['1', 'true', 'on', 'yes']);
const FALSE_VALUES = new Set(['0', 'false', 'off', 'no']);

interface AppDefinition {
  id: string;
  title: string;
  disabled?: boolean;
  screen?: (addFolder?: unknown, openApp?: unknown) => unknown;
}

export interface SelfTestStep {
  id: string;
  label: string;
  status: 'pass' | 'fail';
  durationMs: number;
  detail?: string;
}

export interface SelfTestResult {
  status: 'pass' | 'fail';
  safeMode: boolean;
  appId: string;
  startedAt: number;
  finishedAt: number;
  totalDurationMs: number;
  steps: SelfTestStep[];
  error?: string;
}

export interface SelfTestOptions {
  safeMode?: boolean;
  candidateApps?: string[];
  heavyApps?: string[];
  logger?: Logger;
  now?: () => number;
  openCatalog?: () => void | Promise<void>;
  launchApp?: (app: AppDefinition) => void | Promise<void>;
  closeApp?: (app: AppDefinition) => void | Promise<void>;
}

const defaultNow = () => Date.now();

const defaultOpenCatalog = async () => {
  const catalog = appsCatalog as AppDefinition[];
  if (!Array.isArray(catalog) || catalog.length === 0) {
    throw new Error('Application catalog is empty');
  }
};

const defaultLaunchApp = async (app: AppDefinition) => {
  if (typeof app.screen !== 'function') {
    throw new Error(`App ${app.id} does not expose a launcher`);
  }
  const element = app.screen(() => {}, () => {});
  if (element === null || typeof element === 'undefined') {
    throw new Error(`App ${app.id} failed to render`);
  }
};

const defaultCloseApp = async () => {
  // The self test only verifies launch capability. Closing is a no-op but kept
  // as a hook so tests can assert it was invoked.
};

function parseFlag(value?: string | null): boolean | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (TRUE_VALUES.has(trimmed)) return true;
  if (FALSE_VALUES.has(trimmed)) return false;
  return null;
}

function detectSafeMode(options: SelfTestOptions): boolean {
  if (typeof options.safeMode === 'boolean') {
    return options.safeMode;
  }

  if (typeof process !== 'undefined' && process.env) {
    const envValue =
      process.env.SELF_TEST_SAFE_MODE ?? process.env.NEXT_PUBLIC_SAFE_MODE;
    const parsedEnv = parseFlag(envValue);
    if (parsedEnv !== null) {
      return parsedEnv;
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryValue = params.get('safeMode') ?? params.get('safe-mode');
      const parsedQuery = parseFlag(queryValue);
      if (parsedQuery !== null) {
        return parsedQuery;
      }
    } catch {
      // ignore invalid query parsing
    }
  }

  for (const key of SAFE_MODE_STORAGE_KEYS) {
    const stored = safeLocalStorage?.getItem(key);
    const parsedStored = parseFlag(stored ?? undefined);
    if (parsedStored !== null) {
      return parsedStored;
    }
  }

  return false;
}

function pickTargetApp(
  catalog: AppDefinition[],
  safeMode: boolean,
  candidateApps: string[] | undefined,
  heavyApps: string[] | undefined,
  logger: Logger,
): AppDefinition {
  const heavySet = new Set((heavyApps ?? DEFAULT_HEAVY_APPS).map((id) => id.toLowerCase()));
  const desired = (candidateApps && candidateApps.length > 0
    ? candidateApps
    : DEFAULT_CANDIDATE_APPS
  ).map((id) => id.toLowerCase());

  const filtered = safeMode
    ? desired.filter((id) => {
        const skip = heavySet.has(id);
        if (skip) {
          logger.info('Skipping heavy app during self test', { appId: id });
        }
        return !skip;
      })
    : desired;

  const searchOrder = filtered.length > 0 ? filtered : desired;

  const resolved = searchOrder
    .map((id) => catalog.find((app) => app.id.toLowerCase() === id && !app.disabled))
    .find((entry): entry is AppDefinition => Boolean(entry));

  if (resolved) {
    if (safeMode && heavySet.has(resolved.id.toLowerCase())) {
      throw new Error('Selected app is marked heavy during safe mode');
    }
    return resolved;
  }

  const fallback = catalog.find(
    (app) => !app.disabled && (!safeMode || !heavySet.has(app.id.toLowerCase())),
  );

  if (!fallback) {
    throw new Error('No suitable application available for the self test');
  }

  return fallback;
}

async function runStep<T>(
  id: string,
  label: string,
  action: () => T | Promise<T>,
  now: () => number,
  steps: SelfTestStep[],
  logger: Logger,
): Promise<T> {
  const started = now();
  logger.info('Self test step started', { step: id, label });
  try {
    const value = await action();
    const finished = now();
    const duration = Math.max(0, finished - started);
    steps.push({ id, label, status: 'pass', durationMs: duration });
    logger.info('Self test step finished', { step: id, label, durationMs: duration });
    return value;
  } catch (error) {
    const finished = now();
    const duration = Math.max(0, finished - started);
    const message = error instanceof Error ? error.message : String(error);
    steps.push({ id, label, status: 'fail', durationMs: duration, detail: message });
    logger.error('Self test step failed', {
      step: id,
      label,
      durationMs: duration,
      error: message,
    });
    throw error;
  }
}

export async function runSelfTest(options: SelfTestOptions = {}): Promise<SelfTestResult> {
  const logger = options.logger ?? createLogger();
  const now = options.now ?? defaultNow;
  const steps: SelfTestStep[] = [];
  const safeMode = detectSafeMode(options);
  const result: SelfTestResult = {
    status: 'fail',
    safeMode,
    appId: '',
    startedAt: now(),
    finishedAt: 0,
    totalDurationMs: 0,
    steps,
  };

  try {
    await runStep(
      'open-launcher',
      'Open launcher',
      () => (options.openCatalog ?? defaultOpenCatalog)(),
      now,
      steps,
      logger,
    );

    const catalog = appsCatalog as AppDefinition[];
    const app = await runStep(
      'select-app',
      'Select test app',
      () => pickTargetApp(catalog, safeMode, options.candidateApps, options.heavyApps, logger),
      now,
      steps,
      logger,
    );
    result.appId = app.id;

    await runStep(
      'launch-app',
      `Launch ${app.title}`,
      () => (options.launchApp ?? defaultLaunchApp)(app),
      now,
      steps,
      logger,
    );

    await runStep(
      'close-app',
      'Close app session',
      () => (options.closeApp ?? defaultCloseApp)(app),
      now,
      steps,
      logger,
    );

    result.status = 'pass';
    logger.info('Self test completed successfully', {
      appId: result.appId,
      safeMode: result.safeMode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.error = message;
    logger.warn('Self test completed with errors', {
      appId: result.appId,
      safeMode: result.safeMode,
      error: message,
    });
  } finally {
    result.finishedAt = now();
    result.totalDurationMs = Math.max(0, result.finishedAt - result.startedAt);
  }

  return result;
}

export type { AppDefinition as SelfTestAppDefinition };
export { SAFE_MODE_STORAGE_KEYS };
