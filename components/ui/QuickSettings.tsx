"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import { useLocalization } from '../../hooks/useLocalization';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const {
    direction,
    setDirection,
    pseudoLocaleEnabled,
    setPseudoLocaleEnabled,
    translate,
  } = useLocalization();
  const showDevMenu = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
      style={{ insetInlineEnd: '0.75rem', top: '2.25rem', minWidth: '16rem' }}
    >
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-pressed={theme === 'dark'}
        >
          <span>{translate('quickSettings.theme', 'Theme')}</span>
          <span>
            {theme === 'light'
              ? translate('quickSettings.theme.light', 'Light')
              : translate('quickSettings.theme.dark', 'Dark')}
          </span>
        </button>
      </div>
      <label className="px-4 pb-2 flex items-center justify-between">
        <span>{translate('quickSettings.sound', 'Sound')}</span>
        <input
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
          aria-label={translate('quickSettings.soundToggle', 'Toggle sound notifications')}
        />
      </label>
      <label className="px-4 pb-2 flex items-center justify-between">
        <span>{translate('quickSettings.network', 'Network')}</span>
        <input
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
          aria-label={translate('quickSettings.networkToggle', 'Toggle network availability')}
        />
      </label>
      <label className="px-4 flex items-center justify-between">
        <span>{translate('quickSettings.motion', 'Reduced motion')}</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
          aria-label={translate('quickSettings.motionToggle', 'Toggle reduced motion preference')}
        />
      </label>
      {showDevMenu && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-white/50">
            {translate('quickSettings.devSection', 'Developer')}
          </p>
          <label className="px-4 pb-2 flex items-center justify-between gap-4 text-sm">
            <span>{translate('quickSettings.pseudo', 'Pseudolocalize strings')}</span>
            <input
              type="checkbox"
              checked={pseudoLocaleEnabled}
              onChange={() => setPseudoLocaleEnabled(!pseudoLocaleEnabled)}
              aria-label={translate('quickSettings.pseudoToggle', 'Toggle pseudolocalized strings')}
            />
          </label>
          <label className="px-4 flex items-center justify-between gap-4 text-sm">
            <span>{translate('quickSettings.rtl', 'RTL layout')}</span>
            <input
              type="checkbox"
              checked={direction === 'rtl'}
              onChange={() => setDirection(direction === 'rtl' ? 'ltr' : 'rtl')}
              aria-label={translate('quickSettings.rtlToggle', 'Toggle right-to-left layout')}
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default QuickSettings;
