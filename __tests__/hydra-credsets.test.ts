import { webcrypto } from 'node:crypto';
import { redactText } from '../utils/redaction';
import {
  defaultDraft,
  toCredentialSet,
  validateCredentialDraft,
} from '../components/apps/hydra/credsetsLogic';
import {
  HYDRA_CREDSET_STORAGE_KEY,
  loadHydraCredentialSets,
  saveHydraCredentialSets,
} from '../components/apps/hydra/credsetsStorage';

describe('Hydra credential set helpers', () => {
  beforeAll(() => {
    if (!global.crypto || !(global.crypto as Crypto).subtle) {
      Object.defineProperty(global, 'crypto', {
        value: webcrypto,
      });
    }
  });

  beforeEach(() => {
    localStorage.clear();
  });

  it('redacts sensitive password assignments', () => {
    const input = 'password=SuperSecret123';
    const result = redactText(input);
    expect(result).toContain('<redacted:password>');
    expect(result).not.toContain('SuperSecret123');
  });

  it('flags drafts that contain raw secrets', () => {
    const draft = {
      ...defaultDraft,
      label: 'Production VPN',
      alias: 'analyst-tier1',
      secret: 'password=Spring2025!',
    };
    const validation = validateCredentialDraft(draft);
    expect(validation.errors.some((error) => error.field === 'secret')).toBe(true);
  });

  it('persists credential sets via the secure store', async () => {
    const draft = {
      ...defaultDraft,
      label: 'VPN Portal',
      alias: 'Tier1 Analyst',
      secret: '12 char rotated quarterly',
      notes: 'MFA required; reset via service desk.',
      tags: 'vpn,internal',
    };
    const set = toCredentialSet(draft);
    await saveHydraCredentialSets([set]);
    const stored = localStorage.getItem(HYDRA_CREDSET_STORAGE_KEY);
    expect(stored).toBeTruthy();
    expect(stored).not.toContain('Tier1 Analyst');

    const loaded = await loadHydraCredentialSets();
    expect(loaded).toEqual([set]);
  });
});
