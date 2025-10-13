'use client';
import {
  useEffect,
  useState,
  useRef,
  type RefObject,
  type CSSProperties,
} from 'react';
import useIntersection from '../../hooks/useIntersection';

export default function TimerStopwatch() {
  const [mode, setMode] = useState<'timer' | 'stopwatch'>('timer');
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersection(containerRef as RefObject<Element>);

  useEffect(() => {
    if (isVisible && typeof window !== 'undefined') {
      import('./main');
    }
  }, [isVisible]);

  const terminalThemeVars = {
    '--kali-terminal': 'var(--color-terminal)',
  } as CSSProperties;

  const tabButtonBase =
    'flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';
  const tabInactiveStyles =
    'bg-[color:color-mix(in_srgb,var(--color-accent)_14%,transparent)] text-[color:color-mix(in_srgb,var(--color-accent)_78%,white_22%)] hover:bg-[color:color-mix(in_srgb,var(--color-accent)_22%,transparent)] hover:text-[color:var(--color-accent)]';
  const tabActiveStyles =
    'bg-kali-accent text-kali-dark shadow-lg shadow-[0_8px_24px_rgba(15,118,110,0.25)]';

  const panelWrapperStyles =
    'flex flex-col gap-6 rounded-2xl border border-[color:color-mix(in_srgb,var(--kali-panel-border)_65%,transparent_35%)] bg-[color:color-mix(in_srgb,var(--kali-panel)_92%,transparent_8%)] p-6 shadow-inner backdrop-blur-sm';
  const inputWrapperStyles =
    'flex flex-wrap items-end justify-center gap-4 text-slate-200 sm:justify-start';
  const inputLabelStyles =
    'flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400';
  const inputStyles =
    'w-20 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-center text-lg font-semibold text-slate-100 shadow-inner shadow-black/40 focus:border-kali-primary focus:outline-none focus:ring-2 focus:ring-kali-primary/50';

  const primaryActionButton =
    'rounded-xl border border-kali-primary/40 bg-kali-primary px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-kali-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';
  const dangerActionButton =
    'rounded-xl border border-red-500/40 bg-red-500/90 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';
  const secondaryActionButton =
    'rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-200 shadow-md transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';
  const accentActionButton =
    'rounded-xl border border-kali-accent/40 bg-kali-accent/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-md transition hover:bg-kali-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';

  return (
    <div
      ref={containerRef}
      className="mx-auto flex max-w-xl flex-col gap-6 text-slate-100"
      style={terminalThemeVars}
    >
      <div
        role="tablist"
        aria-label="Timer or stopwatch modes"
        className="flex rounded-2xl border border-[color:color-mix(in_srgb,var(--kali-panel-border)_60%,transparent_40%)] bg-[color:color-mix(in_srgb,var(--kali-panel)_88%,transparent_12%)] p-1 backdrop-blur"
      >
        <button
          id="modeTimer"
          role="tab"
          type="button"
          className={`${tabButtonBase} ${
            mode === 'timer' ? tabActiveStyles : tabInactiveStyles
          }`}
          aria-selected={mode === 'timer'}
          aria-controls="timerControls"
          onClick={() => setMode('timer')}
        >
          Timer
        </button>
        <button
          id="modeStopwatch"
          role="tab"
          type="button"
          className={`${tabButtonBase} ${
            mode === 'stopwatch' ? tabActiveStyles : tabInactiveStyles
          }`}
          aria-selected={mode === 'stopwatch'}
          aria-controls="stopwatchControls"
          onClick={() => setMode('stopwatch')}
        >
          Stopwatch
        </button>
      </div>

      <div
        id="timerControls"
        role="tabpanel"
        className={`${panelWrapperStyles} tab-panel`}
        hidden={mode !== 'timer'}
        aria-labelledby="modeTimer"
        style={{ contentVisibility: 'auto' }}
      >
        <div className={inputWrapperStyles}>
          <label className={inputLabelStyles} htmlFor="minutes">
            Minutes
            <input
              type="number"
              id="minutes"
              min="0"
              defaultValue="0"
              className={inputStyles}
              aria-label="Minutes"
            />
          </label>
          <span
            aria-hidden="true"
            className="pb-2 text-3xl font-semibold leading-none text-[color:var(--kali-terminal)]"
          >
            :
          </span>
          <label className={inputLabelStyles} htmlFor="seconds">
            Seconds
            <input
              type="number"
              id="seconds"
              min="0"
              max="59"
              defaultValue="30"
              className={inputStyles}
              aria-label="Seconds"
            />
          </label>
        </div>

        <div
          className="display rounded-2xl border border-[color:color-mix(in_srgb,var(--kali-panel-border)_60%,transparent_40%)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent_10%)] px-6 py-4 text-center text-5xl font-mono font-semibold tracking-tight text-[color:var(--kali-terminal)] shadow-lg"
          id="timerDisplay"
          aria-live="polite"
        >
          00:30
        </div>

        <div className="flex flex-wrap gap-3">
          <button id="startTimer" type="button" className={primaryActionButton}>
            Start
          </button>
          <button id="stopTimer" type="button" className={dangerActionButton}>
            Stop
          </button>
          <button id="resetTimer" type="button" className={secondaryActionButton}>
            Reset
          </button>
        </div>
      </div>

      <div
        id="stopwatchControls"
        role="tabpanel"
        className={`${panelWrapperStyles} tab-panel`}
        hidden={mode !== 'stopwatch'}
        aria-labelledby="modeStopwatch"
        style={{ contentVisibility: 'auto' }}
      >
        <div
          className="display rounded-2xl border border-[color:color-mix(in_srgb,var(--kali-panel-border)_60%,transparent_40%)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,transparent_10%)] px-6 py-4 text-center text-5xl font-mono font-semibold tracking-tight text-[color:var(--kali-terminal)] shadow-lg"
          id="stopwatchDisplay"
          aria-live="polite"
        >
          00:00
        </div>

        <div className="flex flex-wrap gap-3">
          <button id="startWatch" type="button" className={primaryActionButton}>
            Start
          </button>
          <button id="stopWatch" type="button" className={dangerActionButton}>
            Stop
          </button>
          <button id="resetWatch" type="button" className={secondaryActionButton}>
            Reset
          </button>
          <button id="lapWatch" type="button" className={accentActionButton}>
            Lap
          </button>
        </div>

        <ul
          id="laps"
          className="mt-6 max-h-48 space-y-2 overflow-y-auto pr-1 text-sm text-[color:var(--kali-terminal)] [&>li]:rounded-xl [&>li]:border [&>li]:border-[color:color-mix(in_srgb,var(--kali-panel-border)_55%,transparent_45%)] [&>li]:bg-[color:color-mix(in_srgb,var(--kali-panel)_86%,transparent_14%)] [&>li]:px-4 [&>li]:py-2 [&>li]:font-mono"
        />
      </div>
    </div>
  );
}

