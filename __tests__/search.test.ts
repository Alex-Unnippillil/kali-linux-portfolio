import { performance } from 'perf_hooks';
import { getSearchIndex, searchAll } from '../lib/search';

describe('global search', () => {
  beforeAll(async () => {
    await getSearchIndex();
  });

  it('finds doc headings', async () => {
    const res = await searchAll('Getting Started');
    expect(res.some(r => r.section === 'docs' && r.title === 'Getting Started')).toBe(true);
  });

  it('finds tool names', async () => {
    const res = await searchAll('Nmap');
    expect(res.some(r => r.section === 'tools' && r.title === 'Nmap')).toBe(true);
  });

  it('finds platform slugs', async () => {
    const res = await searchAll('Pacman');
    expect(res.some(r => r.section === 'platforms' && r.title === 'Pacman')).toBe(true);
  });

  it('search is fast', async () => {
    const start = performance.now();
    await searchAll('Nmap');
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });
});
