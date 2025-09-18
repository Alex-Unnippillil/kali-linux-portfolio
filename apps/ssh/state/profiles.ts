import { useCallback, useEffect, useState } from 'react';
import { safeLocalStorage } from '../../../utils/safeStorage';

export type SSHAuthType = 'password' | 'publicKey' | 'keyboardInteractive' | 'agent';

export interface SSHProfile {
  id: string;
  label: string;
  hostname: string;
  port: number;
  username: string;
  authType: SSHAuthType;
  trustedFingerprints: string[];
}

const STORAGE_KEY = 'ssh:profiles';
const KEY_STORAGE_KEY = 'ssh:profiles:key';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type StoragePayload =
  | { plain: true; data: SSHProfile[] }
  | { iv: string; data: string };

const getCrypto = () => {
  if (typeof globalThis === 'undefined') return undefined;
  return globalThis.crypto;
};

const toBase64 = (buffer: ArrayBuffer | Uint8Array) => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof btoa === 'function') {
    let binary = '';
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  throw new Error('No base64 encoder available');
};

const fromBase64 = (value: string) => {
  if (typeof atob === 'function') {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }
  throw new Error('No base64 decoder available');
};

const ensureKey = async (): Promise<CryptoKey | undefined> => {
  const crypto = getCrypto();
  if (!safeLocalStorage || !crypto?.subtle) return undefined;
  const existing = safeLocalStorage.getItem(KEY_STORAGE_KEY);
  if (existing) {
    try {
      const raw = fromBase64(existing);
      return await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    } catch (error) {
      // Fall through to regenerate the key
    }
  }
  try {
    const raw = new Uint8Array(32);
    crypto.getRandomValues(raw);
    const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    safeLocalStorage.setItem(KEY_STORAGE_KEY, toBase64(raw));
    return key;
  } catch (error) {
    return undefined;
  }
};

const encryptProfiles = async (
  profiles: SSHProfile[],
): Promise<{ iv: string; data: string } | undefined> => {
  const crypto = getCrypto();
  const key = await ensureKey();
  if (!crypto?.subtle || !key) return undefined;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = encoder.encode(JSON.stringify(profiles));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(encrypted)) };
};

const decryptProfiles = async (payload: { iv: string; data: string }): Promise<SSHProfile[] | undefined> => {
  const crypto = getCrypto();
  const key = await ensureKey();
  if (!crypto?.subtle || !key) return undefined;
  const iv = fromBase64(payload.iv);
  const data = fromBase64(payload.data);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  const json = decoder.decode(decrypted);
  const parsed = JSON.parse(json);
  return Array.isArray(parsed) ? parsed : [];
};

export const loadProfiles = async (): Promise<SSHProfile[]> => {
  if (!safeLocalStorage) return [];
  const raw = safeLocalStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: StoragePayload | SSHProfile[] = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if ('plain' in parsed && parsed.plain) {
      return parsed.data || [];
    }
    if ('iv' in parsed && 'data' in parsed) {
      const decrypted = await decryptProfiles(parsed);
      return decrypted || [];
    }
  } catch (error) {
    // Ignore parse errors and treat as empty
  }
  return [];
};

export const persistProfiles = async (profiles: SSHProfile[]) => {
  if (!safeLocalStorage) return;
  if (profiles.length === 0) {
    safeLocalStorage.removeItem(STORAGE_KEY);
    return;
  }
  const encrypted = await encryptProfiles(profiles);
  if (encrypted) {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(encrypted));
  } else {
    const payload: StoragePayload = { plain: true, data: profiles };
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
};

const createId = () => {
  const crypto = getCrypto();
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `ssh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

type ProfileInput = Omit<SSHProfile, 'id' | 'trustedFingerprints'> & {
  trustedFingerprints?: string[];
};

type UpdateInput = Partial<Omit<SSHProfile, 'id'>>;

export const useSSHProfiles = () => {
  const [profiles, setProfiles] = useState<SSHProfile[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadProfiles().then((loaded) => {
      if (!active) return;
      setProfiles(loaded);
      setIsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((updater: (prev: SSHProfile[]) => SSHProfile[]) => {
    setProfiles((prev) => {
      const next = updater(prev);
      persistProfiles(next).catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Failed to persist SSH profiles', error);
        }
      });
      return next;
    });
  }, []);

  const addProfile = useCallback(
    (input: ProfileInput): SSHProfile => {
      const profile: SSHProfile = {
        id: createId(),
        label: input.label,
        hostname: input.hostname,
        port: input.port,
        username: input.username,
        authType: input.authType,
        trustedFingerprints: [...(input.trustedFingerprints ?? [])],
      };
      persist((prev) => [...prev, profile]);
      return profile;
    },
    [persist],
  );

  const updateProfile = useCallback(
    (id: string, updates: UpdateInput): SSHProfile | undefined => {
      let updated: SSHProfile | undefined;
      persist((prev) =>
        prev.map((profile) => {
          if (profile.id !== id) return profile;
          const fingerprints = updates.trustedFingerprints
            ? [...updates.trustedFingerprints]
            : [...profile.trustedFingerprints];
          updated = {
            ...profile,
            ...updates,
            id: profile.id,
            trustedFingerprints: fingerprints,
          };
          return updated;
        }),
      );
      return updated;
    },
    [persist],
  );

  const removeProfile = useCallback(
    (id: string) => {
      persist((prev) => prev.filter((profile) => profile.id !== id));
    },
    [persist],
  );

  const recordFingerprint = useCallback(
    (id: string, fingerprint: string): SSHProfile | undefined => {
      let updated: SSHProfile | undefined;
      persist((prev) =>
        prev.map((profile) => {
          if (profile.id !== id) return profile;
          if (profile.trustedFingerprints.includes(fingerprint)) {
            updated = profile;
            return profile;
          }
          updated = {
            ...profile,
            trustedFingerprints: [...profile.trustedFingerprints, fingerprint],
          };
          return updated;
        }),
      );
      return updated;
    },
    [persist],
  );

  return {
    profiles,
    isReady,
    addProfile,
    updateProfile,
    removeProfile,
    recordFingerprint,
  } as const;
};

