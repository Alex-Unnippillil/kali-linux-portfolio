import {
  buildSearchOptions,
  isBinaryContent,
  lineMatches,
  normalizeNeedle,
} from '../../components/apps/find.worker.shared';

describe('find.worker shared helpers', () => {
  it('builds default search options and normalizes queries', () => {
    const options = buildSearchOptions();
    expect(options.caseSensitive).toBe(false);
    const needle = normalizeNeedle('Hello', options);
    expect(needle).toBe('hello');
    expect(lineMatches('Hello world', needle, options)).toBe(true);
  });

  it('detects binary content', () => {
    const binary = new Uint8Array([0, 255, 10]).buffer;
    const text = new Uint8Array([72, 101, 108, 108, 111]).buffer;
    expect(isBinaryContent(binary)).toBe(true);
    expect(isBinaryContent(text)).toBe(false);
  });
});
