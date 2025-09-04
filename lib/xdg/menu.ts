import { DesktopEntry } from './desktop';

// Primary categories defined by the XDG menu specification
export const PRIMARY_CATEGORIES = [
  'AudioVideo',
  'Development',
  'Education',
  'Game',
  'Graphics',
  'Network',
  'Office',
  'Settings',
  'System',
  'Utility',
];

export type Menu<T extends DesktopEntry = DesktopEntry> = Record<string, T[]>;

/**
 * Group desktop entries by their primary category. If no primary
 * category is present, entries are grouped under "Other".
 */
export function buildMenu<T extends DesktopEntry>(entries: T[]): Menu<T> {
  const menu: Menu<T> = {};
  for (const entry of entries) {
    const category =
      entry.categories.find((c) => PRIMARY_CATEGORIES.includes(c)) || 'Other';
    if (!menu[category]) menu[category] = [];
    menu[category].push(entry);
  }
  return menu;
}
