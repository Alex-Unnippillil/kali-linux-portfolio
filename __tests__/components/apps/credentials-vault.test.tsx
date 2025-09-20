import React, { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { webcrypto } from 'crypto';
import {
  SecretVaultProvider,
  useSecretVault,
} from '../../../hooks/useSecretVault';
import {
  SECRET_VAULT_DB_NAME,
  SECRET_VAULT_STORE,
  cancelClipboardWipe,
  createVaultSession,
  readVaultSecrets,
  scheduleClipboardWipe,
  writeVaultSecret,
} from '../../../utils/secretVault';

declare const indexedDB: IDBFactory;

describe('Credentials Vault', () => {
  beforeAll(() => {
    Object.defineProperty(global, 'crypto', {
      value: webcrypto,
      configurable: true,
    });
  });

  const resetVaultDb = async () =>
    new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(SECRET_VAULT_DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });

  beforeEach(async () => {
    await resetVaultDb();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('encrypts secrets and decrypts them with the passphrase', async () => {
    const session = await createVaultSession('passphrase');
    const saved = await writeVaultSecret(session, {
      label: 'Email',
      username: 'alice',
      password: 'SuperSecret!',
      notes: 'Primary inbox account',
      metadata: {
        scopes: ['personal'],
        tags: ['accounts/email'],
        restrictCopy: false,
        expiresAt: null,
      },
    });
    const stored = await session.db.get(SECRET_VAULT_STORE, saved.id);
    expect(stored).toBeDefined();
    expect(stored?.payload).not.toContain('SuperSecret!');

    const roundTrip = await readVaultSecrets(session);
    expect(roundTrip).toHaveLength(1);
    expect(roundTrip[0]).toMatchObject({
      label: 'Email',
      username: 'alice',
      password: 'SuperSecret!',
    });
    session.db.close();
  });

  it('segregates expired items via the unlock context', async () => {
    const session = await createVaultSession('vault-pass');
    const now = Date.now();
    await writeVaultSecret(session, {
      label: 'VPN',
      username: 'corp-user',
      password: 'vpn',
      notes: '',
      metadata: {
        scopes: ['work'],
        tags: ['remote/access'],
        restrictCopy: false,
        expiresAt: now + 60_000,
      },
    });
    await writeVaultSecret(session, {
      label: 'Temp access',
      username: 'contractor',
      password: 'temp',
      notes: '',
      metadata: {
        scopes: ['work'],
        tags: ['remote/access'],
        restrictCopy: false,
        expiresAt: now - 60_000,
      },
    });
    session.db.close();

    const originalPrompt = window.prompt;
    Object.defineProperty(window, 'prompt', {
      configurable: true,
      writable: true,
      value: jest.fn().mockReturnValue('vault-pass'),
    });

    const Harness: React.FC = () => {
      const { unlock, activeItems, expiredItems } = useSecretVault();
      useEffect(() => {
        unlock();
      }, [unlock]);
      return (
        <>
          <span data-testid="active-count">{activeItems.length}</span>
          <span data-testid="expired-count">{expiredItems.length}</span>
        </>
      );
    };

    render(
      <SecretVaultProvider>
        <Harness />
      </SecretVaultProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('active-count').textContent).toBe('1');
    });
    expect(screen.getByTestId('expired-count').textContent).toBe('1');

    if (originalPrompt) {
      Object.defineProperty(window, 'prompt', {
        configurable: true,
        writable: true,
        value: originalPrompt,
      });
    } else {
      delete (window as any).prompt;
    }
  });

  it('clears the clipboard after the scheduled timeout and on teardown', async () => {
    jest.useFakeTimers();
    const writeText = jest.fn().mockResolvedValue(undefined);
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    scheduleClipboardWipe(20000);
    jest.advanceTimersByTime(20000);
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledWith('');

    writeText.mockClear();
    scheduleClipboardWipe(20000);
    await cancelClipboardWipe({ wipe: true });
    expect(writeText).toHaveBeenCalledWith('');

    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
    } else {
      delete (navigator as any).clipboard;
    }
    jest.useRealTimers();
  });
});
