import { buildHarLog, SIMULATED_HAR_PAGES } from '../components/apps/firefox/ExportHAR';
import { toSimulationKey } from '../components/apps/firefox/simulations';

describe('Firefox HAR export', () => {
  it('sanitizes sensitive headers and payloads', () => {
    const key = toSimulationKey('https://www.kali.org/docs/');
    expect(key).toBeTruthy();
    const page = key ? SIMULATED_HAR_PAGES[key] : undefined;
    expect(page).toBeDefined();
    if (!page) {
      return;
    }

    const har = buildHarLog(page.requests, {
      pageUrl: page.url,
      pageTitle: page.title,
      generatedAt: '2024-05-21T00:00:00.000Z',
      pageId: page.id,
    });

    expect(har.log.entries).toHaveLength(page.requests.length);
    const headerNames = har.log.entries.flatMap((entry) =>
      entry.request.headers.concat(entry.response.headers).map((header) => header.name.toLowerCase())
    );
    expect(headerNames).not.toContain('authorization');
    expect(headerNames).not.toContain('set-cookie');
    expect(headerNames).not.toContain('x-api-key');

    const apiEntry = har.log.entries.find((entry) => entry.request.url.includes('/api/navigation'));
    expect(apiEntry?.request.postData?.text).toContain('[redacted]');
    expect(apiEntry?.request.postData?.text).not.toContain('should-be-hidden');
    expect(apiEntry?.response.content.mimeType).toBe('application/json');
  });

  it('produces valid page metadata and timing information', () => {
    const key = toSimulationKey('https://www.exploit-db.com/google-hacking-database');
    expect(key).toBeTruthy();
    const page = key ? SIMULATED_HAR_PAGES[key] : undefined;
    expect(page).toBeDefined();
    if (!page) {
      return;
    }

    const har = buildHarLog(page.requests.slice(0, 2), {
      pageUrl: page.url,
      pageTitle: page.title,
      generatedAt: '2024-06-01T12:00:00.000Z',
      pageId: page.id,
    });

    expect(har.log.pages[0]).toEqual(
      expect.objectContaining({
        id: page.id,
        title: page.title,
        startedDateTime: '2024-06-01T12:00:00.000Z',
      })
    );

    const [firstEntry] = har.log.entries;
    expect(firstEntry.time).toBeGreaterThan(0);
    expect(firstEntry.timings.send + firstEntry.timings.wait + firstEntry.timings.receive).toBe(firstEntry.time);
    expect(firstEntry._resourceType).toBeDefined();
  });

  it('creates a valid HAR log with no entries', () => {
    const har = buildHarLog([], {
      pageUrl: 'https://example.org/',
      pageTitle: 'Empty session',
      generatedAt: '2024-07-01T00:00:00.000Z',
      pageId: 'page-example',
    });

    expect(har.log.entries).toHaveLength(0);
    expect(har.log.pages[0].pageTimings.onContentLoad).toBe(0);
    expect(har.log.pages[0].pageTimings.onLoad).toBe(0);
  });
});
