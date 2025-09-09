'use client';

import { useEffect, useState } from 'react';

export type WhiskerPrefs = {
  showFavorites: boolean;
  showRecent: boolean;
};

const DEFAULT_PREFS: WhiskerPrefs = {
  showFavorites: true,
  showRecent: true,
};

const PREFS_KEY = 'whisker_prefs';

function readPrefs(): WhiskerPrefs {
  try {
    const data = localStorage.getItem(PREFS_KEY);
    if (data) {
      return { ...DEFAULT_PREFS, ...JSON.parse(data) } as WhiskerPrefs;
    }
  } catch (err) {
    console.error('Failed to read whisker prefs', err);
  }
  return DEFAULT_PREFS;
}

function writePrefs(prefs: WhiskerPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to write whisker prefs', err);
  }
}

export function useWhiskerPrefs() {
  const [prefs, setPrefs] = useState<WhiskerPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(readPrefs());
    const handleStorage = () => setPrefs(readPrefs());
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const update = (next: WhiskerPrefs) => {
    setPrefs(next);
    writePrefs(next);
  };

  return [prefs, update] as const;
}

const WhiskerSettings = () => {
  const [prefs, update] = useWhiskerPrefs();

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={prefs.showFavorites}
          onChange={() => update({ ...prefs, showFavorites: !prefs.showFavorites })}
        />
        Show Favorites
      </label>
      <label>
        <input
          type="checkbox"
          checked={prefs.showRecent}
          onChange={() => update({ ...prefs, showRecent: !prefs.showRecent })}
        />
        Show Recent
      </label>
    </div>
  );
};

export default WhiskerSettings;
