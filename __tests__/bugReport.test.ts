import { buildBugReportURL } from '../utils/bugReport';

describe('buildBugReportURL', () => {
  it('encodes metadata and error id for bug reports', () => {
    const href = buildBugReportURL({
      errorId: 'ERR-1234',
      appId: 'terminal',
      appTitle: 'Terminal',
      context: 'app:terminal',
      currentUrl: 'https://example.com/apps/terminal',
    });

    expect(href.startsWith('/input-hub?')).toBe(true);
    const params = new URLSearchParams(href.replace('/input-hub?', ''));
    expect(params.get('preset')).toBe('bug-report');
    expect(params.get('errorId')).toBe('ERR-1234');
    expect(params.get('appId')).toBe('terminal');
    expect(params.get('appTitle')).toBe('Terminal');
    expect(params.get('context')).toBe('app:terminal');
    expect(params.get('url')).toBe('https://example.com/apps/terminal');
    expect(params.get('title')).toBe('Terminal bug report');
    const text = params.get('text') || '';
    expect(text).toContain('App: Terminal');
    expect(text).toContain('Context: app:terminal');
  });
});

