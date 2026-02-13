import {
  __testUtils,
  generatePinsForProfile,
  getProfileById,
} from '../../../apps/reaver/utils/pinAlgorithms';

describe('pinAlgorithms', () => {
  const createMockStorage = () => {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
  };

  const digitsFromSerial = (serial?: string) => {
    if (!serial) return 0;
    const digits = serial.replace(/\D/g, '');
    if (!digits) return 0;
    return parseInt(digits.slice(-7), 10);
  };

  it('derives Netgear PINs from MAC and serial and caches the result', () => {
    const storage = createMockStorage();
    const first = generatePinsForProfile('netgear', { storage });
    expect(first.fromCache).toBe(false);

    const profile = getProfileById('netgear');
    expect(profile).toBeTruthy();
    const macInt = __testUtils.macToInt(profile!.sampleSeed.mac);
    const serialInt = digitsFromSerial(profile!.sampleSeed.serial);
    const expectedSeeds = [
      macInt,
      (macInt + 0x1f) % 0xffffff,
      macInt ^ 0x5a5a5a,
      (macInt + serialInt + 0x27d4eb2d) % 0xffffff,
    ];
    const expectedPins = Array.from(
      new Set(expectedSeeds.map((seed) => __testUtils.formatPin(seed))),
    );
    expect(first.pins).toEqual(expectedPins);

    const second = generatePinsForProfile('netgear', { storage });
    expect(second.fromCache).toBe(true);
    expect(second.pins).toEqual(expectedPins);
  });

  it('creates TP-Link PIN candidates mixing rotation and serial data', () => {
    const profile = getProfileById('tplink');
    expect(profile).toBeTruthy();
    const macInt = __testUtils.macToInt(profile!.sampleSeed.mac);
    const serialInt = digitsFromSerial(profile!.sampleSeed.serial);
    const rotated = ((macInt << 4) | (macInt >> 20)) & 0xffffff;
    const expectedSeeds = [
      macInt,
      rotated,
      (rotated ^ serialInt) % 0xffffff,
      (macInt + serialInt + 104729) % 0xffffff,
      (macInt ^ 0x3adf17) % 0xffffff,
    ];
    const expectedPins = Array.from(
      new Set(expectedSeeds.map((seed) => __testUtils.formatPin(seed))),
    );
    const result = generatePinsForProfile('tplink');
    expect(result.pins).toEqual(expectedPins);
    expect(result.fromCache).toBe(false);
  });

  it('builds diverse D-Link PINs using MAC and serial XORs', () => {
    const profile = getProfileById('dlink');
    expect(profile).toBeTruthy();
    const macInt = __testUtils.macToInt(profile!.sampleSeed.mac);
    const serialInt = digitsFromSerial(profile!.sampleSeed.serial);
    const expectedSeeds = [
      macInt ^ 0x1f2e3d,
      (macInt + 0x1234) % 0xffffff,
      (macInt + serialInt + 0x13ac) % 0xffffff,
      (macInt ^ serialInt ^ 0x5b8d13) % 0xffffff,
    ];
    const expectedPins = Array.from(
      new Set(expectedSeeds.map((seed) => __testUtils.formatPin(seed))),
    );
    const result = generatePinsForProfile('dlink');
    expect(result.pins).toEqual(expectedPins);
  });
});
