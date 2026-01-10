import { createAppScorer, type AppMeta } from '../../components/menu/WhiskerMenu';

describe('createAppScorer', () => {
  const app = (overrides: Partial<AppMeta> = {}): AppMeta => ({
    id: 'app',
    title: 'Generic App',
    icon: '',
    ...overrides,
  });

  it('boosts favourites even without a query', () => {
    const scorer = createAppScorer({
      query: '',
      favoriteIds: new Set(['fav-app']),
      recentIds: [],
    });

    const favourite = scorer(app({ id: 'fav-app' }));
    const regular = scorer(app({ id: 'other-app' }));

    expect(favourite.score).toBeGreaterThan(regular.score);
  });

  it('boosts more recent apps higher than older recents', () => {
    const scorer = createAppScorer({
      query: '',
      favoriteIds: new Set(),
      recentIds: ['recent-one', 'recent-two'],
    });

    const newer = scorer(app({ id: 'recent-one' }));
    const older = scorer(app({ id: 'recent-two' }));
    const never = scorer(app({ id: 'never-opened' }));

    expect(newer.score).toBeGreaterThan(older.score);
    expect(older.score).toBeGreaterThan(never.score);
  });

  it('applies fuzzy scoring to match titles and ids', () => {
    const titleScorer = createAppScorer({
      query: 'met',
      favoriteIds: new Set(),
      recentIds: [],
    });

    const metasploit = titleScorer(app({ id: 'metasploit', title: 'Metasploit' }));
    const terminal = titleScorer(app({ id: 'terminal', title: 'Terminal' }));
    const gedit = titleScorer(app({ id: 'gedit', title: 'Gedit' }));

    expect(metasploit.matches).toBe(true);
    expect(metasploit.score).toBeGreaterThan(0);
    expect(terminal.matches).toBe(false);
    expect(gedit.matches).toBe(false);

    const idScorer = createAppScorer({
      query: 'msf',
      favoriteIds: new Set(),
      recentIds: [],
    });

    const msfPost = idScorer(app({ id: 'msf-post', title: 'MSF Post' }));
    const calculator = idScorer(app({ id: 'calculator', title: 'Calculator' }));

    expect(msfPost.matches).toBe(true);
    expect(calculator.matches).toBe(false);
  });
});
