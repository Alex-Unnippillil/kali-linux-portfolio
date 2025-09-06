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
      {prefs.showHome && <div data-testid="desktop-icon-home">Home</div>}
      {prefs.showTrash && <div data-testid="desktop-icon-trash">Trash</div>}
    </div>
  );
}
