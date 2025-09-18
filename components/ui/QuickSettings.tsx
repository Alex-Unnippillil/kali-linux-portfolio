"use client";

import { useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import { useSettings } from '../../hooks/useSettings';
import { isDarkTheme } from '../../utils/theme';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const {
    theme,
    setTheme,
    reducedMotion,
    setReducedMotion,
    touchMode,
    setTouchMode,
  } = useSettings();

  const containerClasses = useMemo(
    () =>
      [
        'absolute right-3 top-9 z-50 w-64 rounded-lg border border-black/20 bg-ub-cool-grey shadow-lg transition-all duration-200',
        'px-[var(--space-4)] py-[var(--space-4)]',
        open
          ? 'pointer-events-auto opacity-100 translate-y-0'
          : 'pointer-events-none opacity-0 -translate-y-2',
      ].join(' '),
    [open],
  );

  const toggleThemeLabel = isDarkTheme(theme) ? 'Dark' : 'Default';

  return (
    <div
      className={containerClasses}
      data-state={open ? 'open' : 'closed'}
      aria-hidden={!open}
    >
      <div className="flex flex-col gap-[var(--space-3)] text-sm text-white">
        <button
          type="button"
          className="hit-area flex items-center justify-between gap-[var(--space-3)] rounded-md bg-white/5 px-[var(--space-3)] text-left font-medium tracking-wide transition-colors hover:bg-white/10"
          onClick={() => setTheme(isDarkTheme(theme) ? 'default' : 'dark')}
        >
          <span>Theme</span>
          <span>{toggleThemeLabel}</span>
        </button>
        <label className="hit-area flex items-center justify-between gap-[var(--space-3)] rounded-md bg-white/5 px-[var(--space-3)] font-medium text-white transition-colors hover:bg-white/10">
          <span>Sound</span>
          <input
            type="checkbox"
            className="h-[calc(var(--hit-area)/2)] w-[calc(var(--hit-area)/2)]"
            checked={sound}
            onChange={() => setSound(!sound)}
          />
        </label>
        <label className="hit-area flex items-center justify-between gap-[var(--space-3)] rounded-md bg-white/5 px-[var(--space-3)] font-medium text-white transition-colors hover:bg-white/10">
          <span>Network</span>
          <input
            type="checkbox"
            className="h-[calc(var(--hit-area)/2)] w-[calc(var(--hit-area)/2)]"
            checked={online}
            onChange={() => setOnline(!online)}
          />
        </label>
        <label
          className="hit-area flex items-center justify-between gap-[var(--space-3)] rounded-md bg-white/5 px-[var(--space-3)] font-medium text-white transition-colors hover:bg-white/10"
          data-testid="quick-settings-reduced-motion"
        >
          <span>Reduced motion</span>
          <input
            type="checkbox"
            className="h-[calc(var(--hit-area)/2)] w-[calc(var(--hit-area)/2)]"
            checked={reducedMotion}
            onChange={() => setReducedMotion(!reducedMotion)}
          />
        </label>
        <label
          className="hit-area flex items-center justify-between gap-[var(--space-3)] rounded-md bg-white/5 px-[var(--space-3)] font-medium text-white transition-colors hover:bg-white/10"
          data-testid="quick-settings-touch"
        >
          <span>Touch mode</span>
          <input
            type="checkbox"
            className="h-[calc(var(--hit-area)/2)] w-[calc(var(--hit-area)/2)]"
            checked={touchMode}
            onChange={() => setTouchMode(!touchMode)}
          />
        </label>
      </div>
    </div>
  );
};

export default QuickSettings;
