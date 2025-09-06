import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

export type HelperType = 'TerminalEmulator' | 'WebBrowser' | 'FileManager';

const DEFAULT_APPS: Record<HelperType, string> = {
  TerminalEmulator: 'terminal',
  WebBrowser: 'chrome',
  FileManager: 'file-explorer',
};

const rcPath = path.join(os.homedir(), '.config', 'xfce4', 'helpers.rc');

async function readRc(): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(rcPath, 'utf-8');
    const lines = data.split(/\r?\n/);
    const map: Record<string, string> = {};
    for (const line of lines) {
      const m = /^([^=]+)=(.*)$/.exec(line.trim());
      if (m) {
        map[m[1]] = m[2];
      }
    }
    return map;
  } catch (err: any) {
    if (err && err.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeRc(data: Record<string, string>): Promise<void> {
  const dir = path.dirname(rcPath);
  await fs.mkdir(dir, { recursive: true });
  const content = Object.entries(data)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  await fs.writeFile(rcPath, content + '\n', 'utf-8');
}

export async function getPreferredApp(type: HelperType): Promise<string> {
  const rc = await readRc();
  return rc[type] || DEFAULT_APPS[type];
}

export async function setPreferredApp(
  type: HelperType,
  appId: string,
): Promise<void> {
  const rc = await readRc();
  rc[type] = appId;
  await writeRc(rc);
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
