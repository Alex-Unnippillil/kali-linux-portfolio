import { filterAndRankApps } from '../../lib/appSearch';
import type { AppMetadata, AppEntry } from '../../lib/appRegistry';

const buildMeta = (
  override: Partial<AppMetadata> & Pick<AppMetadata, 'title'>,
): AppMetadata => ({
  title: override.title,
  description: override.description ?? '',
  path: override.path ?? '',
  keyboard: override.keyboard ?? [],
  keywords: override.keywords ?? [],
  icon: override.icon,
});

const apps: AppEntry[] = [
  { id: 'terminal', title: 'Terminal' },
  { id: 'security-tools', title: 'Security Tools' },
  { id: 'sticky-notes', title: 'Sticky Notes' },
  { id: 'wireshark', title: 'Wireshark', disabled: true },
];

const metadata: Record<string, AppMetadata> = {
  terminal: buildMeta({
    title: 'Terminal',
    keywords: ['shell', 'cli', 'command line'],
  }),
  'security-tools': buildMeta({
    title: 'Security Tools',
    keywords: ['pentest', 'security suite'],
  }),
  'sticky-notes': buildMeta({
    title: 'Sticky Notes',
    keywords: ['memo', 'reminder'],
  }),
  wireshark: buildMeta({
    title: 'Wireshark',
    keywords: ['packet analyzer', 'network'],
  }),
};

describe('filterAndRankApps', () => {
  it('returns active apps in original order when query is empty', () => {
    const result = filterAndRankApps(apps, metadata, '');
    expect(result.map((app) => app.id)).toEqual([
      'terminal',
      'security-tools',
      'sticky-notes',
    ]);
  });

  it('prioritizes partial matches in titles', () => {
    const result = filterAndRankApps(apps, metadata, 'term');
    expect(result[0]?.id).toBe('terminal');
  });

  it('handles typos via fuzzy scoring', () => {
    const result = filterAndRankApps(apps, metadata, 'termnal');
    expect(result[0]?.id).toBe('terminal');
  });

  it('considers metadata keywords for relevance', () => {
    const result = filterAndRankApps(apps, metadata, 'pentest');
    expect(result.map((app) => app.id)).toEqual(['security-tools']);
  });

  it('ignores disabled apps even when they match', () => {
    const result = filterAndRankApps(apps, metadata, 'packet');
    expect(result).toHaveLength(0);
  });
});
