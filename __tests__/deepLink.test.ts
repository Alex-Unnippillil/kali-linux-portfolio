import {
  parseDeepLinkFromQuery,
  deepLinkSignature,
  normalizeDeepLinkContext,
} from '../lib/deepLink';

describe('parseDeepLinkFromQuery', () => {
  it('returns null when app id is missing', () => {
    expect(parseDeepLinkFromQuery({})).toBeNull();
    expect(parseDeepLinkFromQuery({ app: [''] })).toBeNull();
  });

  it('extracts app id and flattens query values', () => {
    const result = parseDeepLinkFromQuery({
      app: 'terminal',
      cmd: ['help', 'version'],
      theme: 'dark',
      empty: '',
    });
    expect(result).toEqual({
      app: 'terminal',
      context: { cmd: 'version', theme: 'dark' },
    });
  });

  it('drops falsy context entries after coercion', () => {
    expect(
      parseDeepLinkFromQuery({ app: 'terminal', cmd: [''] }),
    ).toEqual({ app: 'terminal' });
  });
});

describe('deepLinkSignature', () => {
  it('generates stable signatures for context maps', () => {
    const link = {
      app: 'terminal',
      context: { cmd: 'help', theme: 'dark' },
    };
    const shuffled = {
      app: 'terminal',
      context: { theme: 'dark', cmd: 'help' },
    };
    expect(deepLinkSignature(link)).toBe('terminal|cmd:help|theme:dark');
    expect(deepLinkSignature(shuffled)).toBe('terminal|cmd:help|theme:dark');
  });
});

describe('normalizeDeepLinkContext', () => {
  it('drops nullish context and returns undefined', () => {
    expect(normalizeDeepLinkContext('terminal', null)).toBeUndefined();
    expect(normalizeDeepLinkContext('terminal', {})).toBeUndefined();
  });

  it('preserves truthy values and coerces to strings', () => {
    expect(
      normalizeDeepLinkContext('files', {
        path: 123,
        empty: '',
        zero: 0,
      }),
    ).toEqual({ path: '123', zero: '0' });
  });

  it('prefers initialCommand but falls back to command fields', () => {
    expect(
      normalizeDeepLinkContext('terminal', {
        command: '  ls  ',
        cmd: 'ignored',
      }),
    ).toEqual({ command: '  ls  ', cmd: 'ignored', initialCommand: '  ls  ' });
    expect(
      normalizeDeepLinkContext('terminal', {
        initialCommand: '',
        cmd: 'help',
      }),
    ).toEqual({ cmd: 'help', initialCommand: 'help' });
  });
});
