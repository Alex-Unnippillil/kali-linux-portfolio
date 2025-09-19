import { performance } from 'perf_hooks';
import {
  buildSettingsSearchIndex,
  filterSettingsSections,
  sortSettingsMatches,
  createSettingsSearch,
  type SettingsSectionMeta,
} from '@/apps/settings/searchIndex';

describe('settings search index', () => {
  const sections: SettingsSectionMeta[] = [
    { id: 'theme', tabId: 'appearance', label: 'Theme', keywords: ['mode', 'appearance'] },
    { id: 'high-contrast', tabId: 'accessibility', label: 'High Contrast', keywords: ['visibility'] },
    { id: 'backup-restore', tabId: 'privacy', label: 'Backup & Restore', keywords: ['export', 'import'] },
  ];

  it('matches queries against labels and keywords case-insensitively', () => {
    const index = buildSettingsSearchIndex(sections);
    const matches = filterSettingsSections(index, 'IMPORT');
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('backup-restore');
  });

  it('sorts matches by relevance and alphabetical order', () => {
    const index = buildSettingsSearchIndex(sections);
    const filtered = filterSettingsSections(index, 'theme');
    const sorted = sortSettingsMatches(filtered, 'theme');
    expect(sorted[0].id).toBe('theme');
  });

  it('remains responsive with large section counts', () => {
    const largeSections: SettingsSectionMeta[] = Array.from({ length: 5000 }, (_, i) => ({
      id: `section-${i}`,
      tabId: i % 2 === 0 ? 'appearance' : 'accessibility',
      label: `Setting ${i}`,
      keywords: [`option ${i}`],
    }));
    const search = createSettingsSearch(largeSections);
    const start = performance.now();
    const results = search('Setting 4999');
    const duration = performance.now() - start;
    expect(results[0]?.id).toBe('section-4999');
    expect(duration).toBeLessThan(60);
  });
});
