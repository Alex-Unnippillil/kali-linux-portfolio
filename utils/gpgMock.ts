export type TrustLevel = 'unknown' | 'marginal' | 'full' | 'ultimate';

export interface GpgKey {
  id: string;
  name: string;
  email: string;
  fingerprint: string;
  publicKey: string;
  privateKey: string;
  revocationCertificate: string;
  trustLevel: TrustLevel;
  createdAt: string;
  expiresAt?: string;
  source: 'generated' | 'imported';
}

let keys: GpgKey[] = [];

const DEMO_KEYS: Array<Pick<GpgKey, 'name' | 'email' | 'fingerprint' | 'trustLevel'>> = [
  {
    name: 'Mock Maintainer',
    email: 'maintainer@example.com',
    fingerprint: 'ABCD1234EFGH5678IJKL9012MNOP3456QRST7890',
    trustLevel: 'full',
  },
  {
    name: 'Release Signing Bot',
    email: 'release-bot@example.com',
    fingerprint: '1234ABCD5678EFGH9012IJKL3456MNOP7890QRST',
    trustLevel: 'marginal',
  },
];

const randomHex = (length: number) => {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(Math.random() * 16)
      .toString(16)
      .toUpperCase();
  }
  return out;
};

const buildPublicKey = (name: string, email: string, fingerprint: string) =>
  [
    '-----BEGIN PGP PUBLIC KEY-----',
    `Name: ${name}`,
    `Email: ${email}`,
    `Fingerprint: ${fingerprint}`,
    randomHex(64),
    '-----END PGP PUBLIC KEY-----',
  ].join('\n');

const buildPrivateKey = (fingerprint: string, passphrase: string) =>
  [
    '-----BEGIN PGP PRIVATE KEY-----',
    `Key: ${fingerprint}`,
    `Passphrase: ${passphrase || 'none'}`,
    randomHex(64),
    '-----END PGP PRIVATE KEY-----',
  ].join('\n');

const buildRevocationCertificate = (fingerprint: string) =>
  [
    '-----BEGIN PGP PUBLIC KEY BLOCK-----',
    `Comment: Revocation certificate for ${fingerprint}`,
    randomHex(80),
    '-----END PGP PUBLIC KEY BLOCK-----',
  ].join('\n');

const normaliseTrustLevel = (trust: string): TrustLevel => {
  if (trust === 'ultimate') return 'ultimate';
  if (trust === 'full') return 'full';
  if (trust === 'marginal') return 'marginal';
  return 'unknown';
};

const seedDemoKeys = () => {
  if (keys.length) return;
  const createdAt = new Date('2023-01-01T00:00:00.000Z').toISOString();
  DEMO_KEYS.forEach((demo) => {
    const id = demo.fingerprint.slice(-8);
    keys.push({
      id,
      name: demo.name,
      email: demo.email,
      fingerprint: demo.fingerprint,
      publicKey: buildPublicKey(demo.name, demo.email, demo.fingerprint),
      privateKey: buildPrivateKey(demo.fingerprint, 'demo-passphrase'),
      revocationCertificate: buildRevocationCertificate(demo.fingerprint),
      trustLevel: demo.trustLevel,
      createdAt,
      source: 'generated',
    });
  });
};

seedDemoKeys();

const simpleDigest = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0').toUpperCase();
};

const clone = (key: GpgKey): GpgKey => ({ ...key });

export const listKeys = async (): Promise<GpgKey[]> => keys.map(clone);

export const createKeyPair = async (
  name: string,
  email: string,
  passphrase: string,
  options: { expiresAt?: string } = {},
): Promise<GpgKey> => {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  if (!trimmedName) {
    throw new Error('Name is required to create a key.');
  }
  if (!trimmedEmail) {
    throw new Error('Email is required to create a key.');
  }
  const fingerprint = `${randomHex(32)}${randomHex(8)}`;
  const id = fingerprint.slice(-8);
  const key: GpgKey = {
    id,
    name: trimmedName,
    email: trimmedEmail,
    fingerprint,
    publicKey: buildPublicKey(trimmedName, trimmedEmail, fingerprint),
    privateKey: buildPrivateKey(fingerprint, passphrase.trim()),
    revocationCertificate: buildRevocationCertificate(fingerprint),
    trustLevel: 'unknown',
    createdAt: new Date().toISOString(),
    expiresAt: options.expiresAt,
    source: 'generated',
  };
  keys = [...keys, key];
  return clone(key);
};

const parseField = (raw: string, label: string) => {
  const match = raw.match(new RegExp(`${label}:(.+)`));
  if (!match) return '';
  return match[1].trim();
};

export const importKey = async (armored: string): Promise<GpgKey> => {
  const text = armored.trim();
  if (!text) {
    throw new Error('Provide an armored key to import.');
  }
  const name = parseField(text, 'Name') || 'Imported Key';
  const email = parseField(text, 'Email') || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.') || 'user'}@imported.test`;
  const fingerprint = (parseField(text, 'Fingerprint') || `${randomHex(32)}${randomHex(8)}`).toUpperCase();
  const id = fingerprint.slice(-8);
  const trust = normaliseTrustLevel(parseField(text, 'Trust'));
  const key: GpgKey = {
    id,
    name,
    email,
    fingerprint,
    publicKey: text,
    privateKey: '-----PRIVATE KEY NOT INCLUDED-----',
    revocationCertificate: buildRevocationCertificate(fingerprint),
    trustLevel: trust,
    createdAt: new Date().toISOString(),
    source: 'imported',
  };
  const existingIndex = keys.findIndex((k) => k.id === id || k.fingerprint === fingerprint);
  if (existingIndex >= 0) {
    keys[existingIndex] = key;
  } else {
    keys = [...keys, key];
  }
  return clone(key);
};

export const signMessage = async (keyId: string, message: string): Promise<string> => {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error('Cannot sign an empty message.');
  }
  const key = keys.find((k) => k.id === keyId);
  if (!key) {
    throw new Error('Key not found for signing.');
  }
  const digest = simpleDigest(`${trimmed}|${key.fingerprint}`);
  return [
    '-----BEGIN PGP SIGNED MESSAGE-----',
    'Hash: SHA256',
    '',
    trimmed,
    '-----BEGIN SIGNATURE-----',
    `Key: ${key.fingerprint}`,
    digest,
    '-----END SIGNATURE-----',
  ].join('\n');
};

export const updateTrustLevel = async (
  keyId: string,
  trust: TrustLevel,
): Promise<GpgKey> => {
  const key = keys.find((k) => k.id === keyId);
  if (!key) {
    throw new Error('Unable to find key.');
  }
  const next: GpgKey = { ...key, trustLevel: trust };
  keys = keys.map((k) => (k.id === keyId ? next : k));
  return clone(next);
};

export const exportPublicKey = async (keyId: string): Promise<string> => {
  const key = keys.find((k) => k.id === keyId);
  if (!key) {
    throw new Error('Unable to export missing key.');
  }
  return key.publicKey;
};

export const exportRevocationCertificate = async (keyId: string): Promise<string> => {
  const key = keys.find((k) => k.id === keyId);
  if (!key) {
    throw new Error('Unable to export missing key.');
  }
  return key.revocationCertificate;
};

export const removeKey = async (keyId: string) => {
  keys = keys.filter((k) => k.id !== keyId);
};

export const resetMock = () => {
  keys = [];
  seedDemoKeys();
};

export const __unsafeGetState = () => keys.map(clone);

