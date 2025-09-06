import React, { useEffect, useState } from 'react';
import {
  loadPreferences,
  subscribe,
  DesktopIconPreferences,
} from '../../utils/desktopIconSettings';

export default function DesktopIcons() {
  const [prefs, setPrefs] = useState<DesktopIconPreferences>(() => loadPreferences());

  useEffect(() => {
    return subscribe(setPrefs);
  }, []);

  return (
    <div>
      {prefs.showHome && (
        <div
          data-testid="desktop-icon-home"
          tabIndex={0}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]"
        >
          Home
        </div>
      )}
      {prefs.showTrash && (
        <div
          data-testid="desktop-icon-trash"
          tabIndex={0}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-accent)]"
        >
          Trash
        </div>
      )}
    </div>
  );
}
