import { buildReaverCommand, detectLockout } from '../components/apps/reaver';

describe('reaver command builder', () => {
  it('serializes selected options into a command string', () => {
    const cmd = buildReaverCommand({
      iface: 'wlan0',
      bssid: 'AA:BB:CC:DD:EE:FF',
      channel: '6',
      verbose: true,
      extra: '-L',
    });
    expect(cmd).toBe('reaver -i wlan0 -b AA:BB:CC:DD:EE:FF -c 6 -vv -L');
  });
});

describe('WPS lockout detection', () => {
  it('detects lockout after three consecutive failures', () => {
    const attempts = [{ success: false }, { success: false }, { success: false }];
    expect(detectLockout(attempts)).toBe(true);
  });

  it('does not lockout if a success breaks the failure streak', () => {
    const attempts = [
      { success: false },
      { success: true },
      { success: false },
      { success: false },
    ];
    expect(detectLockout(attempts)).toBe(false);
  });
});

