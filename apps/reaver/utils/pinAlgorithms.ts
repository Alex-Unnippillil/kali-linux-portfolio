export interface RouterProfile {
  id: string;
  label: string;
  lockAttempts: number;
  lockDuration: number;
}

export interface VendorSeed {
  mac: string;
  serial?: string;
  ssid?: string;
}

export interface VendorProfile extends RouterProfile {
  description: string;
  sampleSeed: VendorSeed;
}

const sanitizeMac = (mac: string) => mac.replace(/[^0-9a-f]/gi, '').toUpperCase();

const macToInt = (mac: string) => {
  const clean = sanitizeMac(mac);
  if (clean.length < 12) {
    throw new Error(`MAC address must include 12 hex chars, received: ${mac}`);
  }
  return parseInt(clean.slice(-6), 16);
};

const digitsFromSerial = (serial?: string) => {
  if (!serial) return 0;
  const digits = serial.replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits.slice(-7), 10);
};

const checksum = (pin: number) => {
  let accum = 0;
  let tmp = pin;
  let factor = 3;
  for (let i = 0; i < 7; i += 1) {
    const digit = tmp % 10;
    accum += digit * factor;
    tmp = Math.floor(tmp / 10);
    factor = factor === 3 ? 1 : 3;
  }
  const checksumDigit = (10 - (accum % 10)) % 10;
  return checksumDigit;
};

const formatPin = (value: number) => {
  const normalized = ((value % 10000000) + 10000000) % 10000000;
  const pinBody = normalized.toString().padStart(7, '0');
  return `${pinBody}${checksum(normalized)}`;
};

const uniquePins = (pins: string[]) => Array.from(new Set(pins));

const genericGenerator = (seed: VendorSeed) => {
  const macInt = macToInt(seed.mac);
  const serialInt = digitsFromSerial(seed.serial);
  const ssidInt = seed.ssid
    ? seed.ssid
        .split('')
        .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0)
    : 0;
  return uniquePins([
    formatPin(macInt),
    formatPin(macInt ^ 0x55aa55),
    formatPin((macInt + serialInt) % 0xffffff),
    formatPin((macInt + ssidInt) % 0xffffff),
    formatPin(serialInt || 0x123456),
  ]);
};

const netgearGenerator = (seed: VendorSeed) => {
  const macInt = macToInt(seed.mac);
  const serialInt = digitsFromSerial(seed.serial);
  const seeds = [
    macInt,
    (macInt + 0x1f) % 0xffffff,
    macInt ^ 0x5a5a5a,
    (macInt + serialInt + 0x27d4eb2d) % 0xffffff,
  ];
  return uniquePins(seeds.map((s) => formatPin(s)));
};

const tplinkGenerator = (seed: VendorSeed) => {
  const macInt = macToInt(seed.mac);
  const serialInt = digitsFromSerial(seed.serial);
  const rotated = ((macInt << 4) | (macInt >> 20)) & 0xffffff;
  const seeds = [
    macInt,
    rotated,
    (rotated ^ serialInt) % 0xffffff,
    (macInt + serialInt + 104729) % 0xffffff,
    (macInt ^ 0x3adf17) % 0xffffff,
  ];
  return uniquePins(seeds.map((s) => formatPin(s)));
};

const dlinkGenerator = (seed: VendorSeed) => {
  const macInt = macToInt(seed.mac);
  const serialInt = digitsFromSerial(seed.serial);
  const seeds = [
    macInt ^ 0x1f2e3d,
    (macInt + 0x1234) % 0xffffff,
    (macInt + serialInt + 0x13ac) % 0xffffff,
    (macInt ^ serialInt ^ 0x5b8d13) % 0xffffff,
  ];
  return uniquePins(seeds.map((s) => formatPin(s)));
};

export const VENDOR_PROFILES: VendorProfile[] = [
  {
    id: 'generic',
    label: 'Generic (no lockout)',
    lockAttempts: Infinity,
    lockDuration: 0,
    description:
      'Derives PIN candidates from MAC, SSID entropy and serial numbers. Provides a baseline heuristic when no vendor data exists.',
    sampleSeed: {
      mac: '00:11:22:33:44:55',
      serial: 'SN12345678',
      ssid: 'DemoWiFi',
    },
  },
  {
    id: 'netgear',
    label: 'Netgear — lock after 5 attempts for 60s',
    lockAttempts: 5,
    lockDuration: 60,
    description:
      'Uses Netgear factory algorithm derived from the last three bytes of the BSSID with checksum variants.',
    sampleSeed: {
      mac: 'F4:CE:46:AA:BB:CC',
      serial: '4CG123456789',
      ssid: 'NETGEAR24',
    },
  },
  {
    id: 'tplink',
    label: 'TP-Link — lock after 3 attempts for 300s',
    lockAttempts: 3,
    lockDuration: 300,
    description:
      'TP-Link seed generator mixes MAC rotations, serial digits and prime offsets observed in default firmware.',
    sampleSeed: {
      mac: 'E8:94:F6:12:34:56',
      serial: '215C1234567',
      ssid: 'TP-LINK_1234',
    },
  },
  {
    id: 'dlink',
    label: 'D-Link — lock after 3 attempts for 120s',
    lockAttempts: 3,
    lockDuration: 120,
    description:
      'D-Link default PINs often XOR MAC suffixes with vendor constants and serial digits, with checksum appended.',
    sampleSeed: {
      mac: 'C0:56:27:89:AB:CD',
      serial: 'PV1234G5678',
      ssid: 'dlink-5G',
    },
  },
];

export const ROUTER_PROFILES: VendorProfile[] = VENDOR_PROFILES;

export const ROUTER_PROFILE_MAP = new Map(
  VENDOR_PROFILES.map((profile) => [profile.id, profile]),
);

export type VendorProfileId = typeof VENDOR_PROFILES[number]['id'];

const generators: Record<VendorProfileId, (seed: VendorSeed) => string[]> = {
  generic: genericGenerator,
  netgear: netgearGenerator,
  tplink: tplinkGenerator,
  dlink: dlinkGenerator,
};

export interface PinGenerationOptions {
  seedOverride?: Partial<VendorSeed>;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
}

export interface PinGenerationResult {
  pins: string[];
  fromCache: boolean;
}

const buildCacheKey = (profile: VendorProfile, seed: VendorSeed) => {
  const mac = sanitizeMac(seed.mac);
  const serial = seed.serial?.trim().toUpperCase() ?? '';
  const ssid = seed.ssid?.trim().toUpperCase() ?? '';
  return `reaver-pin-cache:${profile.id}:${mac}:${serial}:${ssid}`;
};

const mergeSeed = (profile: VendorProfile, seedOverride?: Partial<VendorSeed>): VendorSeed => ({
  mac: seedOverride?.mac ?? profile.sampleSeed.mac,
  serial: seedOverride?.serial ?? profile.sampleSeed.serial,
  ssid: seedOverride?.ssid ?? profile.sampleSeed.ssid,
});

export const generatePinsForProfile = (
  profileId: VendorProfileId,
  options: PinGenerationOptions = {},
): PinGenerationResult => {
  const profile = ROUTER_PROFILE_MAP.get(profileId);
  if (!profile) {
    throw new Error(`Unknown router profile: ${profileId}`);
  }
  const seed = mergeSeed(profile, options.seedOverride);
  const cacheKey = buildCacheKey(profile, seed);
  const storage = options.storage;
  if (storage) {
    const cached = storage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return { pins: parsed, fromCache: true };
        }
      } catch (err) {
        // fall through to regeneration
      }
    }
  }

  const generator = generators[profileId];
  const pins = generator(seed);
  if (storage) {
    try {
      storage.setItem(cacheKey, JSON.stringify(pins));
    } catch (err) {
      // ignore storage errors silently to avoid crashing the simulator
    }
  }
  return { pins, fromCache: false };
};

export const getProfileById = (profileId: VendorProfileId) =>
  ROUTER_PROFILE_MAP.get(profileId);

export const __testUtils = {
  checksum,
  formatPin,
  macToInt,
  sanitizeMac,
};
