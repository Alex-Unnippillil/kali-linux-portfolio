import { normalizeReports, computeTop, validateReport } from '../pages/api/csp-reporter';

describe('csp-reporter utilities', () => {
  test('normalizes report-uri format', () => {
    const body = {
      'csp-report': {
        'document-uri': 'https://example.com',
        'violated-directive': 'script-src',
        'blocked-uri': 'https://evil.com/script.js',
      },
    };
    const res = normalizeReports(body);
    expect(res).toHaveLength(1);
    expect(res[0]['document-uri']).toBe('https://example.com');
  });

  test('normalizes report-to format array', () => {
    const body = [
      {
        body: {
          documentURL: 'https://example.com',
          effectiveDirective: 'img-src',
          blockedURI: 'https://evil.com/img.png',
        },
      },
    ];
    const res = normalizeReports(body);
    expect(res[0]['effective-directive']).toBe('img-src');
  });

  test('computes top offenders', () => {
    const list = [
      {
        'document-uri': 'a',
        'violated-directive': 'script-src',
        'blocked-uri': 'b',
      },
      {
        'document-uri': 'a',
        'violated-directive': 'script-src',
        'blocked-uri': 'b',
      },
      {
        'document-uri': 'a',
        'violated-directive': 'script-src',
        'blocked-uri': 'c',
      },
    ];
    const top = computeTop(list);
    expect(top['script-src'][0]).toEqual({ uri: 'b', count: 2 });
  });

  test('validate report returns helpful errors', () => {
    const errors = validateReport({ 'blocked-uri': '' } as any);
    expect(errors.length).toBeGreaterThan(0);
  });
});

