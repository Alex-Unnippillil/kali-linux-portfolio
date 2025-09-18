import fs from 'fs';
import path from 'path';
import { appMetadata, appCategoryMap } from '../utils/appCatalog';

describe('app catalog metadata', () => {
  const configPath = path.join(__dirname, '..', 'apps.config.js');
  const configSource = fs.readFileSync(configPath, 'utf8');
  const entryPattern = /\{\s*id: '([^']+)',\s*title: '([^']+)'/g;

  const configEntries: Array<{ id: string; title: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = entryPattern.exec(configSource))) {
    configEntries.push({ id: match[1], title: match[2] });
  }

  it('includes metadata for every configured app', () => {
    const metadataById = new Map(appMetadata.map((app) => [app.id, app]));

    configEntries.forEach(({ id, title }) => {
      const meta = metadataById.get(id);
      expect(meta).toBeDefined();
      expect(meta?.title).toBe(title);
      expect(appCategoryMap.has(meta!.category)).toBe(true);
    });

    expect(metadataById.size).toBe(configEntries.length);
  });

  it('does not declare stray metadata entries', () => {
    const configIds = new Set(configEntries.map((entry) => entry.id));
    appMetadata.forEach((meta) => {
      expect(configIds.has(meta.id)).toBe(true);
      expect(appCategoryMap.has(meta.category)).toBe(true);
      expect(meta.tags.length).toBeGreaterThan(0);
    });
  });
});
