import {
  calculateSubnetInfo,
  COMMON_CIDR_PRESETS,
  getBroadcastAddress,
  getHostRange,
  getNetworkAddress,
  getUsableHostCount,
  parseCidrInput,
  prefixToMask,
  validateIPv4Address,
} from '../../modules/networking/subnet';

describe('modules/networking/subnet', () => {
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
      mask: '255.255.255.224',
    });
  });

  it('validates IPv4 addresses and CIDR prefixes', () => {
    expect(() => getNetworkAddress('300.1.1.1', 24)).toThrow('Invalid IPv4 address');
    expect(() => getBroadcastAddress('1.1.1', 24)).toThrow('Invalid IPv4 address');
    expect(() => getHostRange('192.168.0.1', 40)).toThrow('Invalid CIDR prefix');
    expect(() => getUsableHostCount(-1)).toThrow('Invalid CIDR prefix');
  });

  it('parses CIDR input variations and rejects invalid masks', () => {
    expect(parseCidrInput('24')).toEqual({ prefix: 24, source: 'prefix', error: null });
    expect(parseCidrInput(' /30 ')).toEqual({ prefix: 30, source: 'prefix', error: null });
    expect(parseCidrInput('255.255.255.0')).toEqual({ prefix: 24, source: 'mask', error: null });

    expect(parseCidrInput('255.0.255.0').error).toMatch('Subnet mask');
    expect(parseCidrInput('not a prefix').error).toMatch('Enter a CIDR prefix');
  });

  it('derives masks and presets for common prefixes', () => {
    expect(prefixToMask(20)).toBe('255.255.240.0');
    expect(COMMON_CIDR_PRESETS.map((preset) => preset.prefix)).toEqual([
      8, 16, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
    ]);

    const twentyFour = COMMON_CIDR_PRESETS.find((preset) => preset.prefix === 24);
    expect(twentyFour).toMatchObject({
      mask: '255.255.255.0',
      totalAddresses: 256,
      usableHosts: 254,
    });
  });

  it('provides ipv4 validation messaging for UI layers', () => {
    expect(validateIPv4Address('')).toMatch('Enter an IPv4 address');
    expect(validateIPv4Address('192.168.1.1')).toBeNull();
    expect(validateIPv4Address('300.1.1.1')).toMatch('IPv4 address must contain four octets');
  });
});
