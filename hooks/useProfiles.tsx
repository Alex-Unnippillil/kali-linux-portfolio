'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  deleteProfile,
  getProfile,
  listProfiles,
  saveProfile,
  type ProfileMetadata,
} from '../utils/safeIDB';

export const ACTIVE_PROFILE_STORAGE_KEY = 'desktop-active-profile';

interface ProfilesContextValue {
  profiles: ProfileMetadata[];
  activeProfileId: string | null;
  activeProfile: ProfileMetadata | null;
  ready: boolean;
  isSwitching: boolean;
  createProfile: (name?: string) => Promise<ProfileMetadata>;
  deleteProfile: (id: string) => Promise<void>;
  renameProfile: (id: string, name: string) => Promise<void>;
  setActiveProfile: (id: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
}

const ProfilesContext = createContext<ProfilesContextValue | undefined>(undefined);

const PROFILE_NAME_BASE = 'Profile';

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `profile-${Math.random().toString(36).slice(2, 10)}`;
};

const createMetadata = (name: string): ProfileMetadata => {
  const now = Date.now();
  return {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now,
    lastUsed: now,
  };
};

const pickDefaultName = (existing: ProfileMetadata[]) => {
  const used = new Set(existing.map((profile) => profile.name.toLowerCase()));
  if (!used.has('primary profile')) {
    return 'Primary Profile';
  }
  if (!used.has(PROFILE_NAME_BASE.toLowerCase())) {
    return PROFILE_NAME_BASE;
  }
  let suffix = existing.length + 1;
  let candidate = `${PROFILE_NAME_BASE} ${suffix}`;
  while (used.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${PROFILE_NAME_BASE} ${suffix}`;
  }
  return candidate;
};

export const ProfilesProvider = ({ children }: { children: ReactNode }) => {
  const [profiles, setProfiles] = useState<ProfileMetadata[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
  });
  const [ready, setReady] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const persistActiveId = useCallback((id: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, id);
  }, []);

  const loadProfiles = useCallback(async () => {
    const stored = await listProfiles();
    const uniqueProfiles = stored.reduce<ProfileMetadata[]>((acc, profile) => {
      if (!profile?.id) {
        return acc;
      }
      if (acc.some((existing) => existing.id === profile.id)) {
        return acc;
      }
      acc.push(profile);
      return acc;
    }, []);

    let data = uniqueProfiles;
    if (!data.length) {
      const defaultProfile = createMetadata('Primary Profile');
      await saveProfile(defaultProfile);
      data = [defaultProfile];
    }
    data.sort((a, b) => a.createdAt - b.createdAt);
    setProfiles(data);

    let storedActive: string | null = null;
    if (typeof window !== 'undefined') {
      const fromStorage = window.localStorage.getItem(
        ACTIVE_PROFILE_STORAGE_KEY,
      );
      if (fromStorage && data.some((profile) => profile.id === fromStorage)) {
        storedActive = fromStorage;
      } else {
        storedActive = data[0]?.id ?? null;
      }
    } else {
      storedActive = data[0]?.id ?? null;
    }

    if (storedActive) {
      setActiveProfileId(storedActive);
      persistActiveId(storedActive);
    } else {
      setActiveProfileId(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
      }
    }
  }, [persistActiveId]);

  const refreshProfiles = useCallback(async () => {
    await loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadProfiles();
      if (!cancelled) {
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadProfiles]);

  const setActiveProfile = useCallback(
    async (id: string) => {
      if (!id || id === activeProfileId) {
        return;
      }
      setIsSwitching(true);
      setActiveProfileId(id);
      persistActiveId(id);
      const now = Date.now();
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === id
            ? { ...profile, lastUsed: now, updatedAt: now }
            : profile,
        ),
      );
      const profile =
        profiles.find((p) => p.id === id) || (await getProfile(id)) || null;
      if (profile) {
        await saveProfile({ ...profile, lastUsed: now, updatedAt: now });
      }
      setIsSwitching(false);
    },
    [activeProfileId, persistActiveId, profiles],
  );

  const createProfile = useCallback(
    async (name?: string) => {
      const profileName =
        name?.trim() && name.trim().length
          ? name.trim()
          : pickDefaultName(profiles);
      const profile = createMetadata(profileName);
      await saveProfile(profile);
      setProfiles((prev) => [...prev, profile].sort((a, b) => a.createdAt - b.createdAt));
      await setActiveProfile(profile.id);
      return profile;
    },
    [profiles, setActiveProfile],
  );

  const renameProfile = useCallback(
    async (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setProfiles((prev) =>
        prev.map((profile) =>
          profile.id === id
            ? { ...profile, name: trimmed, updatedAt: Date.now() }
            : profile,
        ),
      );
      const target = profiles.find((p) => p.id === id) || (await getProfile(id));
      if (target) {
        await saveProfile({ ...target, name: trimmed, updatedAt: Date.now() });
      }
    },
    [profiles],
  );

  const deleteProfileById = useCallback(
    async (id: string) => {
      if (profiles.length <= 1) return;
      await deleteProfile(id);
      const remaining = profiles.filter((profile) => profile.id !== id);
      setProfiles(remaining);
      if (activeProfileId === id) {
        const fallback = remaining[0]?.id ?? null;
        if (fallback) {
          await setActiveProfile(fallback);
        } else {
          setActiveProfileId(null);
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
          }
        }
      }
    },
    [activeProfileId, profiles, setActiveProfile],
  );

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? null,
    [activeProfileId, profiles],
  );

  const value = useMemo<ProfilesContextValue>(
    () => ({
      profiles,
      activeProfileId,
      activeProfile,
      ready,
      isSwitching,
      createProfile,
      deleteProfile: deleteProfileById,
      renameProfile,
      setActiveProfile,
      refreshProfiles,
    }),
    [
      activeProfile,
      activeProfileId,
      createProfile,
      deleteProfileById,
      isSwitching,
      profiles,
      ready,
      refreshProfiles,
      renameProfile,
      setActiveProfile,
    ],
  );

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
};

export const useProfiles = () => {
  const context = useContext(ProfilesContext);
  if (!context) {
    throw new Error('useProfiles must be used within a ProfilesProvider');
  }
  return context;
};
