import { DesktopEntry } from './desktop';

// Primary categories from the freedesktop.org specification
export const PRIMARY_CATEGORIES = [
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

export type DesktopMenu = Record<string, DesktopEntry[]>;

/**
 * Group desktop entries by their primary category.
 * Unrecognised categories are placed into "Other".
 */
export function groupByCategory(entries: DesktopEntry[]): DesktopMenu {
  const menu: DesktopMenu = {};

  entries.forEach((entry) => {
    const category =
      entry.categories.find((c) => PRIMARY_CATEGORIES.includes(c)) || 'Other';
    if (!menu[category]) {
      menu[category] = [];
    }
    menu[category].push(entry);
  });

  return menu;
}
