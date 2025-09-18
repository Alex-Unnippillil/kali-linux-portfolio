import { macToEui64 } from '../../modules/networking/subnet';

describe('macToEui64', () => {
  const vectors: Array<{ mac: string; expected: string }> = [
    // Examples appear in vendor training guides (e.g. Cisco) and IPv6 primers referencing IEEE EUI-64 derivation.
    { mac: '00:25:96:12:34:56', expected: '0225:96FF:FE12:3456' },
    { mac: 'a0-ce-c8-30-04-7d', expected: 'A2CE:C8FF:FE30:047D' },
    { mac: 'F0.9F.C2.8D.12.34', expected: 'F29F:C2FF:FE8D:1234' },
  ];

  it.each(vectors)('derives %s to %s using the EUI-64 algorithm', ({ mac, expected }) => {
    expect(macToEui64(mac).value).toBe(expected);
  });

  it('normalizes lowercase MAC addresses before processing', () => {
    expect(macToEui64('d4:5d:64:7f:fe:21').value).toBe('D65D:64FF:FE7F:FE21');
  });

  it('rejects inputs that do not contain 48 bits worth of hex characters', () => {
    expect(() => macToEui64('00:11:22:33')).toThrow(
      'MAC address must contain exactly 12 hexadecimal characters.',
    );
  });
});
