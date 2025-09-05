import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';

export interface DesktopIconPreferences {
  showHome: boolean;
  showTrash: boolean;
}

const defaultPrefs: DesktopIconPreferences = {
  showHome: true,
  showTrash: true,
};

const configPath = path.join(
  os.homedir(),
  '.config',
  'xfce4',
  'desktop-icons.json'
);

let current: DesktopIconPreferences = loadFromFile();
const emitter = new EventEmitter();

function loadFromFile(): DesktopIconPreferences {
  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(data);
    return { ...defaultPrefs, ...parsed };
  } catch {
    return { ...defaultPrefs };
  }
}

export function loadPreferences(): DesktopIconPreferences {
  return current;
}

export function savePreferences(prefs: DesktopIconPreferences): void {
  current = { ...defaultPrefs, ...prefs };
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(current, null, 2));
  emitter.emit('change', current);
}

export function subscribe(
  listener: (prefs: DesktopIconPreferences) => void
): () => void {
  emitter.on('change', listener);
  return () => emitter.off('change', listener);
}

// Ensure current is initialized
current = loadFromFile();
