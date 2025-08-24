import { parseSlaac, hasPrivacyExtensions } from '../lib/slaac';

describe('SLAAC parser', () => {
  const sample = `
00:00:01 Router Advertisement from fe80::1
00:00:02 Neighbor Solicitation for fe80::abcd:ff:fe00:1234
00:00:03 interface eth0 ipv6 address autoconfig
`;

  it('detects events and EUI-64 addresses', () => {
    const result = parseSlaac(sample);
    expect(result.events).toHaveLength(3);
    expect(result.eui64Addresses[0]).toBe('fe80::abcd:ff:fe00:1234');
    expect(hasPrivacyExtensions(result)).toBe(false);
  });

  it('reports privacy extensions when no EUI-64 is present', () => {
    const sample2 = `
12:00:00 Router Advertisement from fe80::1
12:00:01 Neighbor Solicitation for 2001:db8::1a2b:3c4d:5e6f:7a8b
`;
    const result = parseSlaac(sample2);
    expect(result.events).toHaveLength(2);
    expect(result.eui64Addresses).toHaveLength(0);
    expect(hasPrivacyExtensions(result)).toBe(true);
  });
});
