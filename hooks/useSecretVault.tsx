import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createVaultSession,
  readVaultSecrets,
  writeVaultSecret,
  deleteVaultSecret,
  deriveExpiryCollections,
  isExpired,
  type SecretVaultDecryptedItem,
  type SecretVaultDraft,
  type SecretVaultSession,
} from '../utils/secretVault';
import { logVaultUnlockFailure } from '../utils/analytics';

interface SecretVaultContextValue {
  locked: boolean;
  loading: boolean;
  error: string | null;
  items: SecretVaultDecryptedItem[];
  activeItems: SecretVaultDecryptedItem[];
  expiredItems: SecretVaultDecryptedItem[];
  expiryWarnings: SecretVaultDecryptedItem[];
  unlock: () => Promise<boolean>;
  refresh: () => Promise<void>;
  saveSecret: (draft: SecretVaultDraft) => Promise<SecretVaultDecryptedItem | null>;
  deleteSecret: (id: string) => Promise<void>;
}

const SecretVaultContext = createContext<SecretVaultContextValue | undefined>(undefined);

const getErrorLabel = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return typeof error === 'string' ? error : 'unknown';
};

export const SecretVaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sessionRef = useRef<SecretVaultSession | null>(null);
  const [items, setItems] = useState<SecretVaultDecryptedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(
    async (activeSession?: SecretVaultSession) => {
      const session = activeSession ?? sessionRef.current;
      if (!session) return;
      setLoading(true);
      try {
        const secrets = await readVaultSecrets(session);
        setItems(secrets);
        setError(null);
      } catch (err) {
        setError('Unable to read stored credentials.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const unlock = useCallback(async () => {
    if (sessionRef.current) {
      return true;
    }
    if (typeof window === 'undefined') {
      const label = 'no-window';
      logVaultUnlockFailure(label);
      setError('The credentials vault is available only in the browser.');
      return false;
    }
    const passphrase = window.prompt('Enter vault passphrase');
    if (!passphrase) {
      logVaultUnlockFailure('cancelled');
      setError('Vault unlock cancelled.');
      return false;
    }
    setLoading(true);
    try {
      const session = await createVaultSession(passphrase);
      sessionRef.current = session;
      setLocked(false);
      setError(null);
      await loadItems(session);
      return true;
    } catch (err) {
      const label = getErrorLabel(err);
      logVaultUnlockFailure(label);
      sessionRef.current = null;
      setLocked(true);
      setError('Unable to unlock vault. Check your passphrase.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadItems]);

  const ensureSession = useCallback(async () => {
    if (sessionRef.current) {
      return sessionRef.current;
    }
    const unlocked = await unlock();
    if (!unlocked || !sessionRef.current) {
      throw new Error('UNLOCK_FAILED');
    }
    return sessionRef.current;
  }, [unlock]);

  const saveSecret = useCallback(
    async (draft: SecretVaultDraft) => {
      try {
        const session = await ensureSession();
        const saved = await writeVaultSecret(session, draft);
        await loadItems(session);
        return saved;
      } catch (err) {
        setError('Unable to save credential.');
        return null;
      }
    },
    [ensureSession, loadItems]
  );

  const removeSecret = useCallback(
    async (id: string) => {
      try {
        const session = await ensureSession();
        await deleteVaultSecret(session, id);
        await loadItems(session);
      } catch {
        setError('Unable to delete credential.');
      }
    },
    [ensureSession, loadItems]
  );

  const refresh = useCallback(async () => {
    await loadItems();
  }, [loadItems]);

  const expiryCollections = useMemo(() => deriveExpiryCollections(items), [items]);
  const expiredItems = expiryCollections.expired;
  const expiryWarnings = expiryCollections.warnings;
  const activeItems = useMemo(
    () => items.filter((item) => !isExpired(item)),
    [items]
  );

  const value = useMemo<SecretVaultContextValue>(
    () => ({
      locked,
      loading,
      error,
      items,
      activeItems,
      expiredItems,
      expiryWarnings,
      unlock,
      refresh,
      saveSecret,
      deleteSecret: removeSecret,
    }),
    [
      locked,
      loading,
      error,
      items,
      activeItems,
      expiredItems,
      expiryWarnings,
      unlock,
      refresh,
      saveSecret,
      removeSecret,
    ]
  );

  return <SecretVaultContext.Provider value={value}>{children}</SecretVaultContext.Provider>;
};

export const useSecretVault = (): SecretVaultContextValue => {
  const context = useContext(SecretVaultContext);
  if (!context) {
    throw new Error('useSecretVault must be used within a SecretVaultProvider');
  }
  return context;
};
