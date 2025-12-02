import { rankPaletteItems, SearchableItem } from '../utils/commandPaletteSearch';

describe('rankPaletteItems', () => {
  const items: SearchableItem[] = [
    {
      id: 'terminal',
      title: 'Terminal',
      description: 'Simulated shell environment',
      keywords: ['shell', 'cli'],
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Adjust preferences and themes',
      keywords: ['preferences', 'theme'],
    },
    {
      id: 'keyboard-reference',
      title: 'Keyboard Reference',
      description: 'View keyboard shortcuts',
      keywords: ['help', 'shortcuts'],
    },
  ];

  it('returns all items when query is empty', () => {
    const results = rankPaletteItems(items, '');
    expect(results).toHaveLength(items.length);
  });

  it('prioritizes closer fuzzy matches', () => {
    const results = rankPaletteItems(items, 'term');
    expect(results[0]?.id).toBe('terminal');
  });

  it('matches on keywords as well as titles', () => {
    const results = rankPaletteItems(items, 'pref');
    expect(results[0]?.id).toBe('settings');
  });

  it('limits results to the provided count', () => {
    const results = rankPaletteItems(items, '', 2);
    expect(results).toHaveLength(2);
  });
});
