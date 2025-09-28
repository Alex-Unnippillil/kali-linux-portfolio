import { rankApps, scoreAppMatch } from '../../components/menu/fuzzyScorer';

describe('fuzzy scorer', () => {
  const apps = [
    { id: 'terminal', title: 'Terminal' },
    { id: 'terminal-pro', title: 'Terminal Pro' },
    { id: 'notes', title: 'Notes' },
  ];

  it('returns original order when the query is empty', () => {
    expect(rankApps(apps, '', {})).toEqual(apps);
  });

  it('ranks closer matches ahead of distant ones', () => {
    const ranked = rankApps(apps, 'term', {});
    expect(ranked.map(app => app.id)).toEqual(['terminal', 'terminal-pro']);
  });

  it('boosts recent launches above cold matches', () => {
    const ranked = rankApps(apps, 'term', { recentIds: ['terminal-pro'] });
    expect(ranked[0].id).toBe('terminal-pro');
  });

  it('adds favorite boost when scoring individual apps', () => {
    const favoriteScore = scoreAppMatch('term', { id: 'terminal', title: 'Terminal', favourite: true });
    const coldScore = scoreAppMatch('term', { id: 'terminal', title: 'Terminal' });
    expect(favoriteScore).toBeGreaterThan(coldScore);
  });
});
