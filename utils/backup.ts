import JSZip from 'jszip';
import { exportSettings, importSettings, exportPanel, importPanel } from './settingsStore';
import { getKeybinds, setKeybinds } from './storage';
import { hasIDB, hasStorage } from './env';
import { getAll as getModules, clearStore, setValue as setModuleValue } from './moduleStore';

export interface BackupChannels {
  appearance: any;
  panel: any;
  keyboard: any;
  session: any;
  apps: Record<string, string>;
}

export async function getBackupData(): Promise<BackupChannels> {
  const appearance = JSON.parse(await exportSettings());
  const panel = JSON.parse(await exportPanel());
  const keyboard = hasIDB ? await getKeybinds() : {};
  const session = hasStorage
    ? JSON.parse(localStorage.getItem('desktop-session') || '{}')
    : {};
  const apps = getModules();
  return { appearance, panel, keyboard, session, apps };
}

export async function exportBackupZip(): Promise<Blob> {
  const zip = new JSZip();
  const data = await getBackupData();
  zip.file('appearance.json', JSON.stringify(data.appearance));
  zip.file('panel.json', JSON.stringify(data.panel));
  zip.file('keyboard.json', JSON.stringify(data.keyboard));
  zip.file('session.json', JSON.stringify(data.session));
  zip.file('apps.json', JSON.stringify(data.apps));
  return zip.generateAsync({ type: 'blob' });
}

export async function parseBackupZip(file: Blob): Promise<BackupChannels> {
  const zip = await JSZip.loadAsync(file);
  const read = async (name: string) => {
    const f = zip.file(`${name}.json`);
    if (!f) return undefined;
    const text = await f.async('string');
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  };
  return {
    appearance: (await read('appearance')) || {},
    panel: (await read('panel')) || {},
    keyboard: (await read('keyboard')) || {},
    session: (await read('session')) || {},
    apps: (await read('apps')) || {},
  };
}

export async function applyBackup(data: BackupChannels): Promise<void> {
  if (data.appearance) await importSettings(data.appearance);
  if (data.panel) await importPanel(data.panel);
  if (data.keyboard && hasIDB) await setKeybinds(data.keyboard);
  if (data.session && hasStorage) {
    localStorage.setItem('desktop-session', JSON.stringify(data.session));
  }
  if (data.apps) {
    clearStore();
    Object.entries(data.apps).forEach(([k, v]) => setModuleValue(k, v));
  }
}

export default {
  getBackupData,
  exportBackupZip,
  parseBackupZip,
  applyBackup,
};

