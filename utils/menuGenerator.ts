import fs from 'node:fs';
import path from 'node:path';

export interface DesktopEntry {
  name: string;
  exec: string;
  icon?: string;
  categories: string[];
  actions: string[];
}

const MAIN_CATEGORIES = [
  'AudioVideo',
  'Development',
  'Education',
  'Game',
  'Graphics',
  'Network',
  'Office',
  'Science',
  'Settings',
  'System',
  'Utility',
];

const DEFAULT_DIRS = [
  '/usr/share/applications',
  path.join(process.env.HOME || '', '.local/share/applications'),
];

const ACTIONS = ['Open menu editor', 'Add to panel', 'Add to desktop'];

function parseDesktopFile(filePath: string): DesktopEntry | null {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  let inEntry = false;
  const data: Record<string, string> = {};
  for (const line of lines) {
    if (line.startsWith('[')) {
      inEntry = line.trim() === '[Desktop Entry]';
      continue;
    }
    if (!inEntry) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    data[key] = value;
  }
  if (!data.Name || !data.Exec) return null;
  const categories = data.Categories
    ? data.Categories.split(';').filter(Boolean)
    : [];
    const entry: DesktopEntry = {
      name: data.Name,
      exec: data.Exec,
      categories,
      actions: ACTIONS,
    };
    if (data.Icon) entry.icon = data.Icon;
    return entry;
  }

export function generateMenu(
  dirs: string[] = DEFAULT_DIRS
): Record<string, DesktopEntry[]> {
  const entries: Record<string, DesktopEntry> = {};
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir)
      .filter((f) => f.endsWith('.desktop'))
      .forEach((file) => {
        const entry = parseDesktopFile(path.join(dir, file));
        if (!entry) return;
        entries[entry.name] = entry;
      });
  });

  const menu: Record<string, DesktopEntry[]> = {};
  Object.values(entries).forEach((entry) => {
    const category =
      entry.categories.find((c) => MAIN_CATEGORIES.includes(c)) || 'Other';
    if (!menu[category]) menu[category] = [];
    menu[category].push(entry);
  });
  return menu;
}

export default generateMenu;
