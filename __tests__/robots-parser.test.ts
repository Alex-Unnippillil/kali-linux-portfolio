import fs from 'fs';
import { parseRobots, testPath, fetchRobots, clearRobotsCache } from '../lib/robots';

describe('robots parser', () => {
  const sample = fs.readFileSync(__dirname + '/fixtures/robots-sample.txt', 'utf8');

  test('parses robots file and identifies unknown directives', () => {
    const data = parseRobots(sample);
    expect(data.sitemaps).toEqual(['https://example.com/sitemap.xml']);
    expect(data.unsupported).toEqual(['Unknown: value']);
    expect(data.groups).toHaveLength(2);
    const google = data.groups[0];
    expect(google.userAgents).toEqual(['googlebot']);
    expect(google.allows).toEqual(['/public/']);
    expect(google.disallows).toEqual(['/private/']);
    const decision = testPath(data, 'googlebot', '/private/secret');
    expect(decision.allowed).toBe(false);
  });

  test('caches fetch results', async () => {
    clearRobotsCache();
    const text = sample;
    const originalFetch = global.fetch;
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => text,
      headers: { get: () => null },
    });
    // @ts-ignore
    global.fetch = mockFetch;
    const data1 = await fetchRobots('https://example.com');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const data2 = await fetchRobots('https://example.com');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(data2).toEqual(data1);
    global.fetch = originalFetch;
  });
});
