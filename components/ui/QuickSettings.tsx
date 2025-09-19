"use client";

import { useEffect } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import {
  SYSTEM_SETTINGS_EVENT,
  ThemePreference,
  SystemSettingChangeDetail,
  getStoredReduceMotionPreference,
  getStoredThemePreference,
  setReduceMotionPreference,
  setThemePreference,
} from '../../utils/systemSettings';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState<ThemePreference>('qs-theme', getStoredThemePreference);
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState(
    'qs-reduce-motion',
    getStoredReduceMotionPreference,
  );

  useEffect(() => {
    setThemePreference(theme, { silent: true });
  }, [theme]);

  useEffect(() => {
    setReduceMotionPreference(reduceMotion, { silent: true });
  }, [reduceMotion]);

  useEffect(() => {
    const handleSettingsChange = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as SystemSettingChangeDetail | undefined;
      if (!detail) return;

      if (detail.setting === 'theme') {
        setTheme((prev) => (prev === detail.value ? prev : detail.value));
      } else if (detail.setting === 'reduceMotion') {
        setReduceMotion((prev) => (prev === detail.value ? prev : detail.value));
      }
    };

    window.addEventListener(SYSTEM_SETTINGS_EVENT, handleSettingsChange as EventListener);
    return () => {
      window.removeEventListener(SYSTEM_SETTINGS_EVENT, handleSettingsChange as EventListener);
    };
  }, [setReduceMotion, setTheme]);

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => {
            const next = theme === 'light' ? 'dark' : 'light';
            setTheme(next);
            setThemePreference(next);
          }}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input type="checkbox" checked={online} onChange={() => setOnline(!online)} />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => {
            const next = !reduceMotion;
            setReduceMotion(next);
            setReduceMotionPreference(next);
          }}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
