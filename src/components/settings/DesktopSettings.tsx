import React, { useEffect, useState } from 'react';
import {
  loadPreferences,
  savePreferences,
  subscribe,
  DesktopIconPreferences,
} from '../../utils/desktopIconSettings';

export default function DesktopSettings() {
  const [activeTab, setActiveTab] = useState<'icons'>('icons');
  const [prefs, setPrefs] = useState<DesktopIconPreferences>(() => loadPreferences());

  useEffect(() => {
    return subscribe(setPrefs);
  }, []);

  const handleChange = (key: keyof DesktopIconPreferences) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const next = { ...prefs, [key]: e.target.checked };
    savePreferences(next);
  };

  return (
    <div>
      <div role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'icons'}
          onClick={() => setActiveTab('icons')}
        >
          Icons
        </button>
      </div>
      {activeTab === 'icons' && (
        <div>
          <label>
            <input
              type="checkbox"
              checked={prefs.showHome}
              onChange={handleChange('showHome')}
            />
            Show Home icon
          </label>
          <label>
            <input
              type="checkbox"
              checked={prefs.showTrash}
              onChange={handleChange('showTrash')}
            />
            Show Trash icon
          </label>
        </div>
      )}
    </div>
  );
}
