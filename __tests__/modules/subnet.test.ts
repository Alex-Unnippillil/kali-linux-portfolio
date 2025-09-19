import fc from 'fast-check';

import {
  calculateSubnetInfo,
  getBroadcastAddress,
  getHostRange,
  getNetworkAddress,
  getUsableHostCount,
} from '../../modules/networking/subnet';

const toInt = (ip: string): number =>
  ip.split('.').reduce((acc, part) => ((acc << 8) | Number(part)) >>> 0, 0);

const maskFromPrefix = (cidr: number): number =>
  cidr === 0 ? 0 : (-1 << (32 - cidr)) >>> 0;

const ipv4Arb = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

const cidrArb = fc.integer({ min: 0, max: 32 });

describe('modules/networking/subnet', () => {
  it('derives network and broadcast masks that envelope the generated IP', () => {
    fc.assert(
      fc.property(ipv4Arb, cidrArb, (ip, cidr) => {
        const network = getNetworkAddress(ip, cidr);
        const broadcast = getBroadcastAddress(ip, cidr);

        const mask = maskFromPrefix(cidr);
        const ipInt = toInt(ip);
        const networkInt = toInt(network);
        const broadcastInt = toInt(broadcast);
        const wildcard = (~mask) >>> 0;

        expect(networkInt).toBe((ipInt & mask) >>> 0);
        expect(broadcastInt).toBe((networkInt | wildcard) >>> 0);
        expect(networkInt).toBeLessThanOrEqual(ipInt);
        expect(broadcastInt).toBeGreaterThanOrEqual(ipInt);
      }),
      { numRuns: 100 }
    );
  });

  it('produces host ranges that sit strictly inside network boundaries when available', () => {
    fc.assert(
      fc.property(ipv4Arb, cidrArb, (ip, cidr) => {
        const range = getHostRange(ip, cidr);
        const network = getNetworkAddress(ip, cidr);
        const broadcast = getBroadcastAddress(ip, cidr);

        if (cidr >= 31) {
          expect(range).toEqual({ firstHost: null, lastHost: null });
          expect(getUsableHostCount(cidr)).toBe(0);
          return;
        }

        expect(range.firstHost).not.toBeNull();
        expect(range.lastHost).not.toBeNull();

        const networkInt = toInt(network);
        const broadcastInt = toInt(broadcast);
        const firstInt = toInt(range.firstHost!);
        const lastInt = toInt(range.lastHost!);

        expect(firstInt).toBe(((networkInt + 1) >>> 0));
        expect(lastInt).toBe(((broadcastInt - 1) >>> 0));
        expect(getUsableHostCount(cidr)).toBe(lastInt - firstInt + 1);
      }),
      { numRuns: 100 }
    );
  });

  it('aggregates subnet info consistently across generated cases', () => {
    fc.assert(
      fc.property(ipv4Arb, cidrArb, (ip, cidr) => {
        const info = calculateSubnetInfo(ip, cidr);

        expect(info.cidr).toBe(cidr);
        expect(info.network).toBe(getNetworkAddress(ip, cidr));
        expect(info.broadcast).toBe(getBroadcastAddress(ip, cidr));
        expect(info.hostRange).toEqual(getHostRange(ip, cidr));
        expect(info.usableHosts).toBe(getUsableHostCount(cidr));
      }),
      { numRuns: 100 }
    );
  });

  it('derives network and broadcast addresses for typical prefixes', () => {
    expect(getNetworkAddress('192.168.1.42', 26)).toBe('192.168.1.0');
    expect(getBroadcastAddress('192.168.1.42', 26)).toBe('192.168.1.63');

    expect(getNetworkAddress('10.0.12.200', 20)).toBe('10.0.0.0');
    expect(getBroadcastAddress('10.0.12.200', 20)).toBe('10.0.15.255');
  });

  it('calculates host range and usable hosts for standard networks', () => {
    const hostRange = getHostRange('172.16.5.10', 24);
    expect(hostRange).toEqual({
      firstHost: '172.16.5.1',
      lastHost: '172.16.5.254',
    });

    expect(getUsableHostCount(24)).toBe(254);
    expect(getUsableHostCount(0)).toBe(4294967294);
  });

  it('returns no usable host range for /31 and /32 networks', () => {
    expect(getHostRange('192.0.2.1', 31)).toEqual({ firstHost: null, lastHost: null });
    expect(getHostRange('192.0.2.1', 32)).toEqual({ firstHost: null, lastHost: null });

    expect(getUsableHostCount(31)).toBe(0);
    expect(getUsableHostCount(32)).toBe(0);
  });

  it('aggregates subnet info with calculateSubnetInfo', () => {
    const info = calculateSubnetInfo('203.0.113.9', 27);
    expect(info).toEqual({
      network: '203.0.113.0',
      broadcast: '203.0.113.31',
      hostRange: {
        firstHost: '203.0.113.1',
        lastHost: '203.0.113.30',
      },
      usableHosts: 30,
      cidr: 27,
    });
  });

  it('validates IPv4 addresses and CIDR prefixes', () => {
    expect(() => getNetworkAddress('300.1.1.1', 24)).toThrow('Invalid IPv4 address');
    expect(() => getBroadcastAddress('1.1.1', 24)).toThrow('Invalid IPv4 address');
    expect(() => getHostRange('192.168.0.1', 40)).toThrow('Invalid CIDR prefix');
    expect(() => getUsableHostCount(-1)).toThrow('Invalid CIDR prefix');
  });
});
