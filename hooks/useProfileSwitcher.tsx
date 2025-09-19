"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface Profile {
  id: string;
  name: string;
}

interface ProfileContextValue {
  profiles: Profile[];
  activeProfileId: string;
  persistentProfileId: string;
  isGuest: boolean;
  switchProfile: (id: string) => void;
  createProfile: (name?: string) => Profile;
  renameProfile: (id: string, name: string) => void;
  storageKey: (key: string) => string;
  enterGuestMode: () => void;
  exitGuestMode: () => void;
}

const STORAGE_KEY = 'profile-switcher';
const DEFAULT_PROFILE: Profile = { id: 'default', name: 'Personal' };

interface StoredState {
  profiles: Profile[];
  activeProfileId: string;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `profile-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readStoredState = (): StoredState => {
  if (typeof window === 'undefined') {
    return { profiles: [DEFAULT_PROFILE], activeProfileId: DEFAULT_PROFILE.id };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { profiles: [DEFAULT_PROFILE], activeProfileId: DEFAULT_PROFILE.id };
    }
    const parsed = JSON.parse(raw) as StoredState;
    if (!parsed.profiles?.length) {
      return { profiles: [DEFAULT_PROFILE], activeProfileId: DEFAULT_PROFILE.id };
    }
    const hasActive = parsed.profiles.some((p) => p.id === parsed.activeProfileId);
    return {
      profiles: parsed.profiles,
      activeProfileId: hasActive ? parsed.activeProfileId : parsed.profiles[0].id,
    };
  } catch {
    return { profiles: [DEFAULT_PROFILE], activeProfileId: DEFAULT_PROFILE.id };
  }
};

export function ProfileProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(readStoredState, []);
  const [profiles, setProfiles] = useState<Profile[]>(initial.profiles);
  const [activeProfileId, setActiveProfileId] = useState(initial.activeProfileId);
  const [guestProfileId, setGuestProfileId] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const lastPersistentId = useRef(initial.activeProfileId);

  useEffect(() => {
    if (isGuest || typeof window === 'undefined') return;
    try {
      const state: StoredState = { profiles, activeProfileId };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore storage failures */
    }
  }, [profiles, activeProfileId, isGuest]);

  const switchProfile = useCallback(
    (id: string) => {
      const exists = profiles.some((profile) => profile.id === id);
      if (!exists) return;
      setIsGuest(false);
      setGuestProfileId(null);
      lastPersistentId.current = id;
      setActiveProfileId(id);
    },
    [profiles],
  );

  const createProfile = useCallback(
    (name?: string) => {
      const profile: Profile = {
        id: generateId(),
        name:
          name ||
          `Profile ${profiles.reduce(
            (count, p) => (p.name.startsWith('Profile ') ? count + 1 : count),
            1,
          )}`,
      };
      setProfiles((prev) => [...prev, profile]);
      return profile;
    },
    [profiles],
  );

  const renameProfile = useCallback((id: string, name: string) => {
    setProfiles((prev) =>
      prev.map((profile) => (profile.id === id ? { ...profile, name } : profile)),
    );
  }, []);

  const enterGuestMode = useCallback(() => {
    const guestId = `guest-${generateId()}`;
    setGuestProfileId(guestId);
    setIsGuest(true);
    lastPersistentId.current = activeProfileId;
    setActiveProfileId(guestId);
  }, [activeProfileId]);

  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
    setGuestProfileId(null);
    const target = lastPersistentId.current;
    const fallback = profiles[0]?.id ?? DEFAULT_PROFILE.id;
    const next = profiles.some((profile) => profile.id === target) ? target : fallback;
    setActiveProfileId(next);
  }, [profiles]);

  const storageKey = useCallback(
    (key: string) => `profile:${activeProfileId}:${key}`,
    [activeProfileId],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      profiles,
      activeProfileId,
      persistentProfileId: isGuest ? lastPersistentId.current : activeProfileId,
      isGuest,
      switchProfile,
      createProfile,
      renameProfile,
      storageKey,
      enterGuestMode,
      exitGuestMode,
    }),
    [
      profiles,
      activeProfileId,
      isGuest,
      switchProfile,
      createProfile,
      renameProfile,
      storageKey,
      enterGuestMode,
      exitGuestMode,
    ],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileSwitcher() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfileSwitcher must be used within a ProfileProvider');
  }
  return ctx;
}

