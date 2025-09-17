import React, { useEffect } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

type Mode = 'basic' | 'scientific' | 'programmer';

const MODES: Mode[] = ['basic', 'scientific', 'programmer'];

interface Props {
  onChange?: (mode: Mode) => void;
}

export default function ModeSwitcher({ onChange }: Props) {
  const [mode, setMode] = usePersistentState<Mode>(
    'calc-mode',
    () => 'basic',
    (v): v is Mode => typeof v === 'string' && MODES.includes(v as Mode),
  );

  useEffect(() => {
    onChange?.(mode);
    // Notify legacy scripts about mode change
    document.dispatchEvent(new CustomEvent('mode-change', { detail: mode }));
  }, [mode, onChange]);

  useEffect(() => {
    const handleExternalMode = (event: Event) => {
      const nextMode = (event as CustomEvent<Mode>).detail;
      if (!nextMode || nextMode === mode || !MODES.includes(nextMode)) return;
      setMode(nextMode);
    };
    document.addEventListener('mode-change', handleExternalMode);
    return () => document.removeEventListener('mode-change', handleExternalMode);
  }, [mode, setMode]);

  return (
    <div className="mode-switcher">
      {MODES.map((m) => (
        <button
          key={m}
          aria-pressed={mode === m}
          onClick={() => setMode(m)}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

export type { Mode };
