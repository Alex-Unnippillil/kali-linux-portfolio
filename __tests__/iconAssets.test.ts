import fs from 'fs';
import path from 'path';

import apps from '../apps.config';

type AppEntry = {
  id?: string;
  title?: string;
  icon?: string;
};

describe('icon asset availability', () => {
  it('ensures every icon path resolves inside public/', () => {
    expect(Array.isArray(apps)).toBe(true);

    const appEntries: AppEntry[] = Array.isArray(apps) ? (apps as AppEntry[]) : [];

    const icons = appEntries
      .filter((entry) => entry && typeof entry === 'object' && typeof entry.icon === 'string' && entry.icon.trim().length > 0)
      .map((entry) => ({
        icon: entry.icon as string,
        label: entry.id ?? entry.title ?? entry.icon ?? 'unknown',
      }));

    expect(icons.length).toBeGreaterThan(0);

    const publicDir = path.join(__dirname, '..', 'public');
    const missing: string[] = [];
    const outside: string[] = [];

    for (const { icon, label } of icons) {
      const normalized = icon.replace(/^\/+/, '');
      const resolved = path.resolve(publicDir, normalized);
      const relative = path.relative(publicDir, resolved);

      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        outside.push(`${label}: ${icon}`);
        continue;
      }

      if (!fs.existsSync(resolved)) {
        missing.push(`${label}: ${icon}`);
      }
    }

    expect(outside).toEqual([]);
    expect(missing).toEqual([]);
  });
});
