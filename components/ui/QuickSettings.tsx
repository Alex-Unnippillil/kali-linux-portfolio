"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import { usePresentationMode } from '../common/PresentationModeContext';
import useKiosk from '../../hooks/useKiosk';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const { enabled: presentationEnabled, toggle: togglePresentation } = usePresentationMode();
  const { restrictions } = useKiosk();
  const quickSettingsLocked = restrictions.disableQuickSettings;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      {quickSettingsLocked && (
        <p className="px-4 pb-3 text-xs text-ubt-grey">
          Controlled by kiosk profile. Presentation mode and toggles are locked.
        </p>
      )}
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => !quickSettingsLocked && setTheme(theme === 'light' ? 'dark' : 'light')}
          disabled={quickSettingsLocked}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
          disabled={quickSettingsLocked}
        />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
          disabled={quickSettingsLocked}
        />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
          disabled={quickSettingsLocked}
        />
      </div>
      <div className="px-4 pt-2 flex justify-between">
        <span>Presentation mode</span>
        <input
          type="checkbox"
          checked={presentationEnabled}
          onChange={() => togglePresentation()}
          disabled={quickSettingsLocked}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
