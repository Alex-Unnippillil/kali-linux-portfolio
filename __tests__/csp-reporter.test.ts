import {
  normalizeReports,
  computeTop,
  validateReport,
  simulatePolicy,
  filterReports,
  sampleReports,
  aggregateReports,
  POLICY_TEMPLATES,
} from '@pages/api/csp-reporter';

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

  test('simulatePolicy flags violations', () => {
    const list = [
      {
        'document-uri': 'https://example.com',
        'violated-directive': 'img-src',
        'blocked-uri': 'https://evil.com/img.png',
      },
    ];
    const sim = simulatePolicy("img-src 'self'", list as any);
    expect(sim.blocked.length).toBe(1);
  });

  test('simulatePolicy allows matching hosts', () => {
    const list = [
      {
        'document-uri': 'https://example.com',
        'violated-directive': 'img-src',
        'blocked-uri': 'https://cdn.example.com/img.png',
      },
    ];
    const sim = simulatePolicy('img-src https://cdn.example.com', list as any);
    expect(sim.blocked.length).toBe(0);
  });

  test('filters, samples and aggregates reports', () => {
    const list = [
      {
        'document-uri': 'a',
        'violated-directive': 'img-src',
        'blocked-uri': 'https://evil.com/a.png',
      },
      {
        'document-uri': 'b',
        'violated-directive': 'script-src',
        'blocked-uri': 'https://evil.com/b.js',
      },
    ];
    const filtered = filterReports(list as any, 'b.js');
    expect(filtered).toHaveLength(1);
    const rand = jest.spyOn(Math, 'random').mockReturnValue(0.6);
    expect(sampleReports(list as any, 0.5)).toHaveLength(0);
    rand.mockReturnValue(0.4);
    expect(sampleReports(list as any, 0.5)).toHaveLength(2);
    rand.mockRestore();
    const agg = aggregateReports(list as any);
    expect(agg['img-src']).toBe(1);
  });

  test('policy templates exposed', () => {
    expect(POLICY_TEMPLATES.some((t) => t.name === 'Strict')).toBe(true);
  });
});

