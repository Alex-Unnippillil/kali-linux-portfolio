export const DESKTOP_SHORTCUT_TARGET = 50;
const WALLPAPERS = [
  'wall-1',
  'wall-2',
  'wall-3',
  'wall-4',
  'wall-5',
  'wall-6',
  'wall-7',
  'wall-8',
] as const;

type StorageSeed = Record<string, string>;

import fs from 'fs';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import type { ObjectProperty } from '@babel/types';

type AppMeta = {
  id: string;
  title?: string;
  desktopShortcut: boolean;
  favourite: boolean;
};

const appsConfigPath = path.join(process.cwd(), 'apps.config.js');

const getPropertyName = (key: ObjectProperty['key']): string | null => {
  if (key.type === 'Identifier') {
    return key.name;
  }
  if (key.type === 'StringLiteral') {
    return key.value;
  }
  return null;
};

const extractAppMetadata = (): AppMeta[] => {
  const source = fs.readFileSync(appsConfigPath, 'utf8');
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'classProperties', 'objectRestSpread'],
  });
  const metadata = new Map<string, AppMeta>();

  traverse(ast, {
    ObjectExpression(path) {
      let id: string | null = null;
      let title: string | undefined;
      let desktopShortcut = false;
      let favourite = false;

      for (const property of path.node.properties) {
        if (property.type !== 'ObjectProperty') continue;
        const name = getPropertyName(property.key);
        if (!name) continue;
        const value = property.value;

        if (name === 'id' && value.type === 'StringLiteral') {
          id = value.value;
        } else if (name === 'title' && value.type === 'StringLiteral') {
          title = value.value;
        } else if (name === 'desktop_shortcut' && value.type === 'BooleanLiteral') {
          desktopShortcut = value.value;
        } else if (name === 'favourite' && value.type === 'BooleanLiteral') {
          favourite = value.value;
        }
      }

      if (!id) return;
      const existing = metadata.get(id);
      metadata.set(id, {
        id,
        title: existing?.title ?? title,
        desktopShortcut: existing?.desktopShortcut || desktopShortcut,
        favourite: existing?.favourite || favourite,
      });
    },
  });

  return Array.from(metadata.values());
};

const appMetadata = extractAppMetadata();

const sortByTitle = (a: AppMeta, b: AppMeta) => {
  const aTitle = (a.title || a.id).toLowerCase();
  const bTitle = (b.title || b.id).toLowerCase();
  if (aTitle < bTitle) return -1;
  if (aTitle > bTitle) return 1;
  return a.id.localeCompare(b.id);
};

const sortedMetadata = [...appMetadata].sort(sortByTitle);

export function getDeterministicShortcutIds(count = DESKTOP_SHORTCUT_TARGET): string[] {
  const defaults = sortedMetadata.filter((app) => app.desktopShortcut);
  const extras = sortedMetadata.filter((app) => !app.desktopShortcut);
  const seen = new Set<string>();
  const shortcuts: string[] = [];

  const push = (app: AppMeta) => {
    if (seen.has(app.id) || shortcuts.length >= count) {
      return;
    }
    seen.add(app.id);
    shortcuts.push(app.id);
  };

  defaults.forEach(push);
  for (const app of extras) {
    if (shortcuts.length >= count) break;
    push(app);
  }

  if (shortcuts.length < count) {
    throw new Error(`Unable to seed ${count} desktop shortcuts. Only ${shortcuts.length} available.`);
  }

  return shortcuts.slice(0, count);
}

export function getDefaultPinnedApps(): string[] {
  const favourites: string[] = [];
  const seen = new Set<string>();
  for (const app of sortedMetadata) {
    if (!app.favourite || seen.has(app.id)) continue;
    seen.add(app.id);
    favourites.push(app.id);
  }
  return favourites;
}

export function createDesktopStorageSeed(count = DESKTOP_SHORTCUT_TARGET): {
  shortcuts: string[];
  pinnedApps: string[];
  wallpaper: string;
  storage: StorageSeed;
} {
  const shortcuts = getDeterministicShortcutIds(count);
  const pinnedApps = getDefaultPinnedApps();
  const wallpaper = 'wall-2';
  const storage: StorageSeed = {
    app_shortcuts: JSON.stringify(shortcuts),
    pinnedApps: JSON.stringify(pinnedApps),
    'booting_screen': 'false',
    'screen-locked': 'false',
    'shut-down': 'false',
    'bg-image': wallpaper,
    new_folders: JSON.stringify([]),
  };

  return { shortcuts, pinnedApps, wallpaper, storage };
}

export function getAlternateWallpaper(current: string): string {
  const normalized = current
    .replace('/wallpapers/', '')
    .replace('.webp', '')
    .trim();
  const currentId = (normalized || 'wall-2') as (typeof WALLPAPERS)[number];
  for (const candidate of WALLPAPERS) {
    if (candidate !== currentId) {
      return candidate;
    }
  }
  return WALLPAPERS[0];
}
