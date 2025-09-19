"use client";

import { ChangeEvent, useEffect } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { useLocale } from '../../hooks/useLocale';
import { isSupportedLocale } from '../../utils/loadLocale';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const { t, locale, setLocale, availableLocales, isLoading } = useLocale();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  const handleLocaleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value;
    if (isSupportedLocale(nextLocale)) {
      setLocale(nextLocale);
    }
  };

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>{t('quickSettings.theme')}</span>
          <span>
            {theme === 'light'
              ? t('quickSettings.themeLight')
              : t('quickSettings.themeDark')}
          </span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>{t('quickSettings.sound')}</span>
        <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>{t('quickSettings.network')}</span>
        <input type="checkbox" checked={online} onChange={() => setOnline(!online)} />
      </div>
      <div className="px-4 flex justify-between">
        <span>{t('quickSettings.reduceMotion')}</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
      <div className="px-4 pt-3 pb-2">
        <label
          htmlFor="quick-settings-locale"
          className="flex items-center justify-between gap-3"
        >
          <span>{t('quickSettings.language')}</span>
          <select
            id="quick-settings-locale"
            className="bg-ub-cool-grey border border-black border-opacity-20 rounded px-2 py-1 text-xs text-ubt-grey"
            value={locale}
            onChange={handleLocaleChange}
          >
            {availableLocales.map(({ code, label }) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {isLoading && (
          <p className="mt-1 text-xs text-ubt-grey">{t('quickSettings.loadingLocale')}</p>
        )}
      </div>
    </div>
  );
};

export default QuickSettings;
