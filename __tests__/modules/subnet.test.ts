import {
  calculateSubnetInfo,
  getAddressClass,
  getBinaryIPv4,
  getBroadcastAddress,
  getHostRange,
  getNetworkAddress,
  getSubnetMask,
  getUsableHostCount,
  getWildcardMask,
  isPrivateIPv4,
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


  it('derives subnet masks and wildcard masks from CIDR', () => {
    expect(getSubnetMask(24)).toBe('255.255.255.0');
    expect(getSubnetMask(17)).toBe('255.255.128.0');

    expect(getWildcardMask(24)).toBe('0.0.0.255');
    expect(getWildcardMask(30)).toBe('0.0.0.3');
  });

  it('classifies addresses and detects RFC1918 private ranges', () => {
    expect(getAddressClass('10.1.2.3')).toBe('A');
    expect(getAddressClass('172.20.10.2')).toBe('B');
    expect(getAddressClass('192.0.2.10')).toBe('C');

    expect(isPrivateIPv4('10.1.2.3')).toBe(true);
    expect(isPrivateIPv4('172.20.10.2')).toBe(true);
    expect(isPrivateIPv4('192.168.10.12')).toBe(true);
    expect(isPrivateIPv4('203.0.113.4')).toBe(false);
  });

  it('renders binary representation of IPv4 addresses', () => {
    expect(getBinaryIPv4('192.168.1.10')).toBe('11000000.10101000.00000001.00001010');
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
      subnetMask: '255.255.255.224',
      wildcardMask: '0.0.0.31',
      binaryIp: '11001011.00000000.01110001.00001001',
      addressClass: 'C',
      privateAddress: false,
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
