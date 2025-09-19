"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import { useLocale } from '../../hooks/useLocale';
import LocaleSwitcher from '../common/LocaleSwitcher';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const { t, isLoading: localeLoading } = useLocale();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      aria-busy={localeLoading}
      aria-label={t('quickSettings.panelLabel')}
      className={`absolute top-9 right-3 rounded-md border border-black border-opacity-20 bg-ub-cool-grey py-4 shadow transition-opacity ${
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      data-testid="quick-settings-panel"
      style={{ minWidth: '18rem' }}
    >
      <div className="flex flex-col gap-3 px-4 text-ubt-grey">
        <button
          className="flex items-center justify-between gap-4 rounded px-2 py-1 text-left transition hover:bg-black/10"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label={t('quickSettings.theme')}
        >
          <span>{t('quickSettings.theme')}</span>
          <span className="min-w-[5rem] text-right font-medium">
            {theme === 'light' ? t('quickSettings.themeValue.light') : t('quickSettings.themeValue.dark')}
          </span>
        </button>
        <label className="flex items-center justify-between gap-4">
          <span>{t('quickSettings.sound')}</span>
          <input
            type="checkbox"
            aria-label={t('quickSettings.sound')}
            checked={sound}
            onChange={() => setSound(!sound)}
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>{t('quickSettings.network')}</span>
          <input
            type="checkbox"
            aria-label={t('quickSettings.network')}
            checked={online}
            onChange={() => setOnline(!online)}
          />
        </label>
        <label className="flex items-center justify-between gap-4">
          <span>{t('quickSettings.reducedMotion')}</span>
          <input
            type="checkbox"
            aria-label={t('quickSettings.reducedMotion')}
            checked={reduceMotion}
            onChange={() => setReduceMotion(!reduceMotion)}
          />
        </label>
        <LocaleSwitcher className="pt-1" />
      </div>
    </div>
  );
};

export default QuickSettings;
