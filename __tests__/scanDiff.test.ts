import { diffScans, normalizeServiceName, type PortService } from '../utils/scanDiff';

describe('diffScans', () => {
  test('ignores ephemeral ports by default', () => {
    const a: PortService[] = [{ port: 80, service: 'http' }];
    const b: PortService[] = [
      { port: 80, service: 'http' },
      { port: 50000, service: 'random' },
    ];
    const diff = diffScans(a, b, { ignoreEphemeral: true });
    expect(diff.added).toHaveLength(0);
  });

  test('normalizes service names', () => {
    const a: PortService[] = [{ port: 80, service: 'http' }];
    const b: PortService[] = [{ port: 80, service: 'www-http' }];
    const diff = diffScans(a, b, {
      normalizeService: normalizeServiceName,
    });
    expect(diff.changed).toHaveLength(0);
  });
});
