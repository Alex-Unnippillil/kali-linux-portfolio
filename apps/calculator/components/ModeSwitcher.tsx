import { useEffect } from 'react';
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

  return (
    <div className="relative">
      <label htmlFor="mode-select" className="sr-only">
        Calculator mode
      </label>
      <select
        id="mode-select"
        value={mode}
        onChange={(event) => setMode(event.target.value as Mode)}
        className="appearance-none rounded-xl border border-white/10 bg-[#2a2d35] py-2 pl-3 pr-10 text-sm font-semibold capitalize text-slate-100 shadow-inner focus-visible:border-[#f97316] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]"
      >
        {MODES.map((m) => (
          <option key={m} value={m} className="bg-[#1f212a] capitalize">
            {m}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400"
        viewBox="0 0 12 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2 2l4 4 4-4" />
      </svg>
    </div>
  );
}

export type { Mode };
