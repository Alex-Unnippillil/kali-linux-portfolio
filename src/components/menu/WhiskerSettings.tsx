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

const configPath = () => {
  const path = require('path');
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.config', 'whisker');
};

function readPrefs(): WhiskerPrefs {
  try {
    const fs = require('fs');
    const path = require('path');
    const dir = configPath();
    const file = path.join(dir, 'whisker.json');
    if (fs.existsSync(file)) {
      const data = fs.readFileSync(file, 'utf8');
      return { ...DEFAULT_PREFS, ...JSON.parse(data) } as WhiskerPrefs;
    }
  } catch (err) {
    console.error('Failed to read whisker prefs', err);
  }
  return DEFAULT_PREFS;
}

function writePrefs(prefs: WhiskerPrefs) {
  try {
    const fs = require('fs');
    const path = require('path');
    const dir = configPath();
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'whisker.json');
    fs.writeFileSync(file, JSON.stringify(prefs, null, 2));
  } catch (err) {
    console.error('Failed to write whisker prefs', err);
  }
}

export function useWhiskerPrefs() {
  const [prefs, setPrefs] = useState<WhiskerPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(readPrefs());
    try {
      const fs = require('fs');
      const path = require('path');
      const file = path.join(configPath(), 'whisker.json');
      fs.watchFile(file, () => {
        setPrefs(readPrefs());
      });
      return () => fs.unwatchFile(file);
    } catch (err) {
      console.error('Failed to watch whisker prefs', err);
    }
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
