'use client';
import { useEffect, useState, useRef, RefObject } from 'react';
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

  const tabButtonBase =
    'flex-1 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';
  const tabInactiveStyles =
    'border-kali-border/60 bg-kali-surface/70 text-white/70 hover:border-kali-accent/40 hover:bg-kali-surface/90 hover:text-white';
  const tabActiveStyles =
    'border-kali-accent/70 bg-kali-primary text-kali-inverse shadow-lg shadow-[0_8px_24px_rgba(15,148,210,0.35)]';

  const panelWrapperStyles =
    'flex flex-col gap-6 rounded-2xl border border-kali-border/60 bg-kali-surface/80 p-6 shadow-inner shadow-black/30 backdrop-blur-sm';
  const inputWrapperStyles =
    'flex flex-wrap items-end justify-center gap-4 text-kali-text sm:justify-start';
  const inputLabelStyles =
    'flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-white/60';
  const inputStyles =
    'w-20 rounded-lg border border-kali-border/60 bg-kali-dark/80 px-3 py-2 text-center text-lg font-semibold text-kali-text shadow-inner shadow-black/40 focus:border-kali-accent focus:outline-none focus:ring-2 focus:ring-kali-accent/50';

  const successActionButton =
    'rounded-xl border border-kali-terminal/40 bg-kali-terminal px-4 py-2 text-sm font-semibold text-[color:var(--kali-terminal-text)] shadow-md transition hover:bg-kali-terminal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';
  const dangerActionButton =
    'rounded-xl border border-kali-error/60 bg-kali-error px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-kali-error/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';
  const neutralActionButton =
    'rounded-xl border border-kali-border/60 bg-kali-surface/80 px-4 py-2 text-sm font-semibold text-white/85 shadow-md transition hover:border-kali-accent/40 hover:bg-kali-surface/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';
  const accentActionButton =
    'rounded-xl border border-kali-accent/50 bg-kali-accent px-4 py-2 text-sm font-semibold text-kali-inverse shadow-md transition hover:bg-kali-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus';

  return (
    <div
      ref={containerRef}
      className="mx-auto flex max-w-xl flex-col gap-6 text-kali-text"
    >
      <div
        role="tablist"
        aria-label="Timer or stopwatch modes"
        className="flex rounded-2xl border border-kali-border/60 bg-kali-surface/70 p-1 backdrop-blur"
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
            className="pb-2 text-3xl font-semibold leading-none text-kali-accent"
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
          className="display rounded-2xl border border-kali-border/60 bg-kali-dark/80 px-6 py-4 text-center text-5xl font-mono font-semibold tracking-tight text-kali-accent shadow-lg shadow-black/40"
          id="timerDisplay"
          aria-live="polite"
        >
          00:30
        </div>

        <div className="flex flex-wrap gap-3">
          <button id="startTimer" type="button" className={successActionButton}>
            Start
          </button>
          <button id="stopTimer" type="button" className={dangerActionButton}>
            Stop
          </button>
          <button id="resetTimer" type="button" className={neutralActionButton}>
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
          className="display rounded-2xl border border-kali-border/60 bg-kali-dark/80 px-6 py-4 text-center text-5xl font-mono font-semibold tracking-tight text-kali-accent shadow-lg shadow-black/40"
          id="stopwatchDisplay"
          aria-live="polite"
        >
          00:00
        </div>

        <div className="flex flex-wrap gap-3">
          <button id="startWatch" type="button" className={successActionButton}>
            Start
          </button>
          <button id="stopWatch" type="button" className={dangerActionButton}>
            Stop
          </button>
          <button id="resetWatch" type="button" className={neutralActionButton}>
            Reset
          </button>
          <button id="lapWatch" type="button" className={accentActionButton}>
            Lap
          </button>
        </div>

        <ul
          id="laps"
          className="mt-6 max-h-48 space-y-2 overflow-y-auto pr-1 text-sm text-kali-text [&>li]:rounded-xl [&>li]:border [&>li]:border-kali-border/60 [&>li]:bg-kali-surface/70 [&>li]:px-4 [&>li]:py-2 [&>li]:font-mono [&>li]:text-white/85"
        />
      </div>
    </div>
  );
}

