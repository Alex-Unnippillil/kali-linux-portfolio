import { parseDeepLinkQuery, resolveDeepLink } from '../utils/deeplink';
import type { DeepLinkParams } from '../utils/deeplink';

describe('parseDeepLinkQuery', () => {
  it('returns none when no deep-link parameters are present', () => {
    expect(parseDeepLinkQuery({})).toEqual({ kind: 'none' });
  });

  it('rejects malformed context payloads', () => {
    const result = parseDeepLinkQuery({
      open: 'terminal',
      v: '1',
      ctx: '%7Bnot-json',
    });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.code).toBe('invalid');
      expect(result.error.message).toContain('Unable to parse deep link');
    }
  });

  it('rejects unsupported versions', () => {
    const result = parseDeepLinkQuery({ open: 'terminal', v: '99' });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.error.code).toBe('unsupported-version');
      expect(result.error.message).toContain('not supported');
    }
  });
});

describe('resolveDeepLink', () => {
  const available = ['terminal', 'wireshark', '2048'];

  it('resolves exact matches', () => {
    const params: DeepLinkParams = {
      version: 1,
      targetId: 'terminal',
      fallback: 'exact',
    };
    const result = resolveDeepLink(params, { availableIds: available, expectedId: 'terminal' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.appId).toBe('terminal');
      expect(result.value.reason).toBe('exact');
    }
  });

  it('falls back to the closest match when permitted', () => {
    const params: DeepLinkParams = {
      version: 1,
      targetId: 'wirehark',
      fallback: 'open-closest',
    };
    const result = resolveDeepLink(params, { availableIds: available, expectedId: 'wireshark' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.appId).toBe('wireshark');
      expect(result.value.reason).toBe('open-closest');
    }
  });

  it('reports when the resolved app differs from the expected route', () => {
    const params: DeepLinkParams = {
      version: 1,
      targetId: 'wirehark',
      fallback: 'open-closest',
    };
    const result = resolveDeepLink(params, { availableIds: available, expectedId: 'terminal' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('mismatch');
      expect(result.error.suggestion).toBe('wireshark');
    }
  });

  it('reports when no app can be resolved', () => {
    const params: DeepLinkParams = {
      version: 1,
      targetId: 'non-existent',
      fallback: 'exact',
    };
    const result = resolveDeepLink(params, { availableIds: available, expectedId: 'terminal' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not-found');
      expect(result.error.target).toBe('non-existent');
    }
  });
});
