import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { DesktopEntry, parseDesktopEntry } from './desktopEntry';

export interface MenuItem {
  id: string;
  name: string;
  desktop?: string;
  icon?: string;
  exec?: string;
  categories?: string[];
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface MenuJson {
  categories?: MenuCategory[];
}

const readJson = async (file: string): Promise<MenuJson> => {
  try {
    const text = await fs.readFile(file, 'utf8');
    return JSON.parse(text);
  } catch {
    return { categories: [] };
  }
};

const mergeCategories = (
  base: MenuCategory[] = [],
  extra: MenuCategory[] = [],
): MenuCategory[] => {
  const map = new Map<string, MenuCategory>();
  for (const cat of base) map.set(cat.id, { ...cat, items: [...(cat.items || [])] });
  for (const cat of extra) {
    if (!map.has(cat.id)) {
      map.set(cat.id, { ...cat, items: [...(cat.items || [])] });
      continue;
    }
    const existing = map.get(cat.id)!;
    const itemMap = new Map(existing.items.map((i) => [i.id, i]));
    for (const item of cat.items) itemMap.set(item.id, item);
    existing.items = Array.from(itemMap.values());
  }
  return Array.from(map.values());
};

/**
 * Load menu data by merging system and user menu files and parsing .desktop entries
 */
export const loadMenu = async (): Promise<MenuCategory[]> => {
  const systemPath = '/data/applications.menu.json';
  const userPath = path.join(
    os.homedir(),
    '.config/menus/xfce-applications.menu.json',
  );

  const system = await readJson(systemPath);
  const user = await readJson(userPath);
  const categories = mergeCategories(system.categories, user.categories);

  for (const cat of categories) {
    const parsedItems: MenuItem[] = [];
    for (const item of cat.items || []) {
      if (item.desktop) {
        const entry: DesktopEntry | null = await parseDesktopEntry(item.desktop);
        if (entry && !entry.noDisplay) {
          const parsed: MenuItem = { id: item.id || entry.name, name: entry.name };
          if (entry.icon) parsed.icon = entry.icon;
          if (entry.exec) parsed.exec = entry.exec;
          if (entry.categories) parsed.categories = entry.categories;
          parsedItems.push(parsed);
        }
      } else {
        parsedItems.push(item);
      }
    }
    cat.items = parsedItems;
  }

  return categories;
};

export default loadMenu;
