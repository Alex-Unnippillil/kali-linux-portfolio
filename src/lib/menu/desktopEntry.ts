import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface DesktopEntry {
  type?: string;
  name: string;
  exec?: string;
  icon?: string;
  categories?: string[];
  terminal?: boolean;
  noDisplay?: boolean;
}

// Simple INI parser tailored for .desktop files
const parseIni = (text: string): Record<string, Record<string, string>> => {
  const result: Record<string, Record<string, string>> = {};
  let current: Record<string, string> | null = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const section = line.match(/^\[(.+)]$/);
    if (section) {
      const key = section[1];
      if (key) {
        current = result[key] = {};
      }
      continue;
    }
    if (!current) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    current[key] = value;
  }
  return result;
};

/**
 * Parse a single .desktop file into a DesktopEntry.
 * Returns null if the file cannot be read or lacks a Desktop Entry group.
 */
export const parseDesktopEntry = async (file: string): Promise<DesktopEntry | null> => {
  try {
    const text = await fs.readFile(file, 'utf8');
    const data = parseIni(text)['Desktop Entry'];
    if (!data) return null;
    const entry: DesktopEntry = {
      name: data.Name || path.basename(file),
      terminal: data.Terminal === 'true',
      noDisplay: data.NoDisplay === 'true',
    };
    if (data.Type) entry.type = data.Type;
    if (data.Exec) entry.exec = data.Exec;
    if (data.Icon) entry.icon = data.Icon;
    if (data.Categories)
      entry.categories = data.Categories.split(';').filter(Boolean);
    return entry;
  } catch {
    return null;
  }
};

/**
 * Load desktop entries according to XDG merge semantics.
 * Earlier directories in the search path have precedence.
 */
export const loadDesktopEntries = async (
  dirs: string[] = [
    path.join(os.homedir(), '.local/share/applications'),
    '/usr/local/share/applications',
    '/usr/share/applications',
  ],
): Promise<Record<string, DesktopEntry>> => {
  const entries = new Map<string, DesktopEntry>();
  for (const dir of dirs) {
    try {
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (!file.endsWith('.desktop')) continue;
        const abs = path.join(dir, file);
        const parsed = await parseDesktopEntry(abs);
        if (parsed) {
          // According to XDG spec, earlier directories override later ones
          entries.set(file, parsed);
        }
      }
    } catch {
      // ignore missing directories
    }
  }
  return Object.fromEntries(entries);
};

