export type HelperType = 'TerminalEmulator' | 'WebBrowser' | 'FileManager';

const DEFAULT_APPS: Record<HelperType, string> = {
  TerminalEmulator: 'terminal',
  WebBrowser: 'chrome',
  FileManager: 'file-explorer',
};

const STORAGE_KEY = 'xfce-helpers';

function readRc(): Record<string, string> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeRc(data: Record<string, string>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function getPreferredApp(type: HelperType): Promise<string> {
  const rc = readRc();
  return rc[type] || DEFAULT_APPS[type];
}

export async function setPreferredApp(
  type: HelperType,
  appId: string,
): Promise<void> {
  const rc = readRc();
  rc[type] = appId;
  writeRc(rc);
}

export async function exoOpen(
  type: HelperType,
  openApp: (id: string, arg?: string) => void,
  arg?: string,
): Promise<void> {
  const appId = await getPreferredApp(type);
  if (!appId) {
    throw new Error(`No preferred application configured for ${type}`);
  }
  openApp(appId, arg);
}
