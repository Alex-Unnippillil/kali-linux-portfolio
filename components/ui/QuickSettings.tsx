"use client";

import { useCallback, useEffect, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { useProfileSwitcher } from '../../hooks/useProfileSwitcher';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const {
    profiles,
    activeProfileId,
    persistentProfileId,
    isGuest,
    switchProfile,
    createProfile,
    renameProfile,
    enterGuestMode,
    exitGuestMode,
  } = useProfileSwitcher();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const selectedProfileId = useMemo(
    () => (isGuest ? persistentProfileId : activeProfileId),
    [activeProfileId, isGuest, persistentProfileId],
  );

  const handleCreateProfile = useCallback(() => {
    const name = window.prompt('Name this profile?', 'Profile');
    const trimmed = name?.trim();
    const profile = createProfile(trimmed || undefined);
    switchProfile(profile.id);
  }, [createProfile, switchProfile]);

  const handleRenameProfile = useCallback(
    (id: string, currentName: string) => {
      const name = window.prompt('Rename profile', currentName);
      const trimmed = name?.trim();
      if (!trimmed || trimmed === currentName) return;
      renameProfile(id, trimmed);
    },
    [renameProfile],
  );

  const handleGuestToggle = useCallback(() => {
    if (isGuest) {
      exitGuestMode();
    } else {
      enterGuestMode();
    }
  }, [enterGuestMode, exitGuestMode, isGuest]);

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 w-64 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-3 border-b border-black/30">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Profiles</span>
          <button
            type="button"
            className="text-xs text-ubt-grey hover:text-white"
            onClick={(event) => {
              event.stopPropagation();
              handleCreateProfile();
            }}
          >
            + New
          </button>
        </div>
        <ul className="mt-2 space-y-1" aria-label="Available profiles">
          {profiles.map((profile) => {
            const isActiveProfile = selectedProfileId === profile.id;
            const willRestore = isGuest && profile.id === persistentProfileId;
            return (
              <li key={profile.id}>
                <button
                  type="button"
                  className={`w-full flex items-center justify-between rounded px-2 py-1 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ub-orange ${
                    isActiveProfile ? 'bg-ub-dark text-white' : 'hover:bg-ub-mid'
                  }`}
                  onClick={() => switchProfile(profile.id)}
                >
                  <span className="truncate">{profile.name}</span>
                  <span className="text-[0.65rem] uppercase tracking-wide text-ubt-grey">
                    {isGuest && profile.id === activeProfileId
                      ? 'Guest'
                      : isActiveProfile
                        ? 'Active'
                        : willRestore
                          ? 'Saved'
                          : ''}
                  </span>
                </button>
                <button
                  type="button"
                  className="mt-1 text-[0.65rem] uppercase tracking-wide text-ubt-grey hover:text-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRenameProfile(profile.id, profile.name);
                  }}
                >
                  Rename
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="px-4 py-3 border-b border-black/30">
        <button
          type="button"
          className="w-full rounded bg-ub-orange px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-ubt-orange"
          onClick={(event) => {
            event.stopPropagation();
            handleGuestToggle();
          }}
        >
          {isGuest ? 'Exit Guest Session' : 'Browse as Guest'}
        </button>
        <p className="mt-2 text-xs leading-snug text-ubt-grey">
          Guest sessions use in-memory storage and wipe preferences when you exit.
        </p>
      </div>

      <div className="px-4 pt-3 space-y-2">
        <button
          type="button"
          className="w-full flex justify-between"
          onClick={(event) => {
            event.stopPropagation();
            setTheme(theme === 'light' ? 'dark' : 'light');
          }}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
        <label className="flex items-center justify-between">
          <span>Sound</span>
          <input
            type="checkbox"
            checked={sound}
            onChange={(event) => {
              event.stopPropagation();
              setSound(!sound);
            }}
          />
        </label>
        <label className="flex items-center justify-between">
          <span>Network</span>
          <input
            type="checkbox"
            checked={online}
            onChange={(event) => {
              event.stopPropagation();
              setOnline(!online);
            }}
          />
        </label>
        <label className="flex items-center justify-between">
          <span>Reduced motion</span>
          <input
            type="checkbox"
            checked={reduceMotion}
            onChange={(event) => {
              event.stopPropagation();
              setReduceMotion(!reduceMotion);
            }}
          />
        </label>
      </div>
    </div>
  );
};

export default QuickSettings;
