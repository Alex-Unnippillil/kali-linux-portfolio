import { getSearchDocuments } from '../utils/appCatalog';
import { createSearchEngine } from '../utils/search/appSearch';

describe('app search worker logic', () => {
  const documents = getSearchDocuments();
  const engine = createSearchEngine(documents);

  it('finds apps by title and tags', () => {
    const wifiMatches = engine.search('wifi').map((hit) => hit.id);
    expect(wifiMatches).toContain('reaver');
    expect(wifiMatches).toContain('kismet');

    const passwordMatches = engine.search('password').map((hit) => hit.id);
    expect(passwordMatches).toContain('john');
    expect(passwordMatches).toContain('hydra');

    const portfolioMatches = engine.search('portfolio').map((hit) => hit.id);
    expect(portfolioMatches).toContain('about');
    expect(portfolioMatches).toContain('project-gallery');
  });

  it('responds within the performance budget', () => {
    const iterations = 200;
    const queries = ['meta', 'game', 'note', 'network'];
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

    for (let i = 0; i < iterations; i += 1) {
      queries.forEach((term) => {
        engine.search(term);
      });
    }

    const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const duration = end - start;
    const averagePerQuery = duration / (iterations * queries.length);

    expect(averagePerQuery).toBeLessThan(6);
  });
});
