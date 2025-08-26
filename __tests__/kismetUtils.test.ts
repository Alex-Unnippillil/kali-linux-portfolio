import { lookupVendor, getNetworkAlerts } from '../components/apps/kismet/utils';

describe('OUI lookup', () => {
  test('returns vendor for known prefix', () => {
    expect(lookupVendor('00:11:22:33:44:55')).toBe('Test Vendor');
  });

  test('returns unknown for unrecognized prefix', () => {
    expect(lookupVendor('FF:FF:FF:00:00:00')).toBe('Unknown');
  });
});

describe('network alerts', () => {
  test('detects new network', () => {
    const prev = [{ ssid: 'A', strength: -50 }];
    const curr = [...prev, { ssid: 'B', strength: -40 }];
    expect(getNetworkAlerts(prev, curr)).toEqual([{ type: 'new', ssid: 'B' }]);
  });

  test('detects sharp strength change', () => {
    const prev = [{ ssid: 'A', strength: -50 }];
    const curr = [{ ssid: 'A', strength: -20 }];
    expect(getNetworkAlerts(prev, curr, 20)).toEqual([
      { type: 'strength', ssid: 'A', delta: 30 },
    ]);
  });
});
