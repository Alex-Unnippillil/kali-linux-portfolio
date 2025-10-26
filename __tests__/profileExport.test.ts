import { webcrypto } from 'node:crypto';
import {
  createProfileExport,
  readProfileExport,
  PROFILE_EXPORT_VERSION,
  ProfileChecksumMismatchError,
  InvalidProfilePasswordError,
} from '../lib/profileExport';

beforeAll(() => {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    Object.defineProperty(globalThis, 'crypto', {
      value: webcrypto,
      configurable: true,
    });
  }
});

describe('profile export', () => {
  const password = 's3cure-password';
  const payload = {
    schema: 'ble-profiles',
    profiles: [
      {
        deviceId: 'dev-1',
        name: 'Test Device',
        services: [],
      },
    ],
  };

  it('encrypts and decrypts profile data while preserving metadata', async () => {
    const metadata = { schema: 'ble-profiles', profileCount: payload.profiles.length };
    const exported = await createProfileExport(payload, password, metadata);
    expect(typeof exported).toBe('string');

    const result = await readProfileExport<typeof payload>(exported, password);
    expect(result.data).toEqual(payload);
    expect(result.metadata).toEqual(metadata);
    expect(result.version).toBe(PROFILE_EXPORT_VERSION);
    expect(new Date(result.createdAt).toString()).not.toBe('Invalid Date');
  });

  it('rejects tampered payloads using the checksum guard', async () => {
    const exported = await createProfileExport(payload, password);
    const parsed = JSON.parse(exported);
    parsed.checksum = 'invalid-checksum';
    const tampered = JSON.stringify(parsed);

    await expect(
      readProfileExport<typeof payload>(tampered, password)
    ).rejects.toBeInstanceOf(ProfileChecksumMismatchError);
  });

  it('rejects decrypt attempts with the wrong password', async () => {
    const exported = await createProfileExport(payload, password);
    await expect(
      readProfileExport<typeof payload>(exported, 'incorrect-password')
    ).rejects.toBeInstanceOf(InvalidProfilePasswordError);
  });
});
