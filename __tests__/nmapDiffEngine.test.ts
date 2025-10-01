import { computeDiff, mergeDiffResults, emptyDiff } from '../components/apps/nmap-nse/diffEngine';

describe('nmap diff engine', () => {
  it('computes new, lost, and state changes', () => {
    const baseHosts = [
      {
        address: '192.0.2.10',
        hostname: 'web',
        ports: [
          { port: 80, protocol: 'tcp', state: 'open', service: 'http' },
          { port: 443, protocol: 'tcp', state: 'closed', service: 'https' },
        ],
      },
      {
        address: '192.0.2.20',
        hostname: 'db',
        ports: [
          { port: 5432, protocol: 'tcp', state: 'open', service: 'postgresql' },
        ],
      },
    ];
    const targetHosts = [
      {
        address: '192.0.2.10',
        hostname: 'web',
        ports: [
          { port: 80, protocol: 'tcp', state: 'open', service: 'http' },
          { port: 443, protocol: 'tcp', state: 'open', service: 'https' },
          { port: 22, protocol: 'tcp', state: 'open', service: 'ssh' },
        ],
      },
    ];

    const diff = computeDiff({ baseHosts, targetHosts });

    expect(diff.newServices).toHaveLength(1);
    expect(diff.newServices[0]).toMatchObject({
      host: '192.0.2.10',
      port: 22,
      service: 'ssh',
      state: 'open',
    });

    expect(diff.lostServices).toHaveLength(1);
    expect(diff.lostServices[0]).toMatchObject({
      host: '192.0.2.20',
      port: 5432,
      service: 'postgresql',
      state: 'open',
    });

    expect(diff.stateChanges).toHaveLength(1);
    expect(diff.stateChanges[0]).toMatchObject({
      host: '192.0.2.10',
      port: 443,
      fromState: 'closed',
      toState: 'open',
    });
  });

  it('merges diff segments safely', () => {
    const merged = mergeDiffResults([
      {
        ...emptyDiff(),
        newServices: [
          { host: '192.0.2.10', port: 22, protocol: 'tcp', state: 'open', service: 'ssh' },
        ],
      },
      {
        ...emptyDiff(),
        lostServices: [
          { host: '192.0.2.20', port: 5432, protocol: 'tcp', state: 'open', service: 'postgresql' },
        ],
      },
    ]);

    expect(merged.newServices).toHaveLength(1);
    expect(merged.lostServices).toHaveLength(1);
    expect(merged.stateChanges).toHaveLength(0);
  });
});
