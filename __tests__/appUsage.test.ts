import { AppUsageMap, rankApps } from '../utils/appUsage';

type TestApp = {
  id: string;
  title: string;
};

describe('rankApps', () => {
  const apps: TestApp[] = [
    { id: 'fresh', title: 'Fresh App' },
    { id: 'stale', title: 'Stale App' },
    { id: 'never', title: 'Never Used' },
  ];

  it('prefers recently opened apps when older usage decays', () => {
    const now = 1_700_000_000_000;
    const usage: AppUsageMap = {
      fresh: { count: 2, lastOpened: now - 1_000 },
      stale: { count: 10, lastOpened: now - 14 * 24 * 60 * 60 * 1000 },
    };

    const result = rankApps(apps, '', usage, now).map((app) => app.id);

    expect(result).toEqual(['fresh', 'stale', 'never']);
  });

  it('prioritizes exact title matches over higher usage', () => {
    const now = 1_700_000_000_000;
    const usage: AppUsageMap = {
      termite: { count: 50, lastOpened: now - 500 },
    };
    const searchApps: TestApp[] = [
      { id: 'terminal', title: 'Terminal' },
      { id: 'termite', title: 'Termite Analyzer' },
    ];

    const result = rankApps(searchApps, 'Terminal', usage, now).map((app) => app.id);

    expect(result[0]).toBe('terminal');
  });

  it('boosts higher frequency apps for partial matches when recency is similar', () => {
    const now = 1_700_000_000_000;
    const usage: AppUsageMap = {
      nmap: { count: 6, lastOpened: now - 5_000 },
      notes: { count: 1, lastOpened: now - 4_000 },
    };
    const searchApps: TestApp[] = [
      { id: 'nmap', title: 'Nmap Scanner' },
      { id: 'notes', title: 'Notes' },
    ];

    const result = rankApps(searchApps, 'n', usage, now).map((app) => app.id);

    expect(result[0]).toBe('nmap');
  });
});
