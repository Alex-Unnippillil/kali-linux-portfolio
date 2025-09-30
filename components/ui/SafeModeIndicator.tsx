'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSafeMode } from '../../hooks/useSafeMode';

const formatMemory = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

const formatInp = (value: number) => `${Math.round(value)} ms`;

const SafeModeIndicator = () => {
  const {
    safeModeActive,
    manualOverride,
    metrics,
    trigger,
    lastTrigger,
    enableSafeMode,
    disableSafeMode,
    resetOverride,
    clearTrigger,
  } = useSafeMode();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  const statusLabel = useMemo(() => {
    if (safeModeActive) {
      if (manualOverride === 'forced-on') {
        return 'Safe mode manually enabled';
      }
      const reason = trigger ?? lastTrigger;
      if (!reason) return 'Safe mode active';
      if (reason.reason === 'inp') {
        return `Safe mode active: INP spike (${formatInp(reason.value)})`;
      }
      if (reason.reason === 'memory') {
        return `Safe mode active: memory spike (${formatMemory(reason.value)})`;
      }
      return 'Safe mode active';
    }
    if (manualOverride === 'forced-off') {
      return 'Safe mode manually disabled';
    }
    return 'Safe mode monitoring';
  }, [safeModeActive, manualOverride, trigger, lastTrigger]);

  const details = useMemo(() => {
    const reference = trigger ?? lastTrigger;
    if (!reference) {
      return 'No performance alerts recorded in this session.';
    }
    if (reference.reason === 'manual') {
      return 'Safe mode was enabled manually.';
    }
    if (reference.reason === 'inp') {
      return `Last INP alert at ${formatInp(reference.value)} (threshold ${formatInp(reference.threshold)}).`;
    }
    return `Last memory alert at ${formatMemory(reference.value)} (threshold ${formatMemory(reference.threshold)}).`;
  }, [lastTrigger, trigger]);

  const badgeTone = safeModeActive
    ? 'border-emerald-300/60 bg-emerald-500/10 text-emerald-100 hover:border-emerald-200/80 hover:bg-emerald-500/20'
    : manualOverride === 'forced-off'
      ? 'border-slate-500/40 bg-slate-900/70 text-slate-200 hover:border-slate-300/70 hover:bg-slate-900/90'
      : 'border-sky-400/40 bg-sky-500/10 text-sky-100 hover:border-sky-200/80 hover:bg-sky-500/20';

  const indicatorTone = safeModeActive
    ? 'bg-emerald-400'
    : manualOverride === 'forced-off'
      ? 'bg-slate-400'
      : 'bg-sky-400';

  const metricSummary = useMemo(() => {
    const parts: string[] = [];
    if (typeof metrics.inp === 'number') parts.push(`INP ${formatInp(metrics.inp)}`);
    if (typeof metrics.memory === 'number') parts.push(`Memory ${formatMemory(metrics.memory)}`);
    return parts.length > 0 ? parts.join(' • ') : 'Awaiting metrics';
  }, [metrics.inp, metrics.memory]);

  return (
    <div ref={containerRef} className="relative hidden items-center sm:flex">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open ? 'true' : 'false'}
        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${badgeTone}`}
        title={statusLabel}
      >
        <span className={`h-2 w-2 rounded-full transition-colors ${indicatorTone}`} aria-hidden="true" />
        <span className="hidden md:inline">Safe mode</span>
        <span className="md:hidden">Safe</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 max-w-xs rounded-xl border border-slate-800/70 bg-slate-950/95 p-3 text-xs text-slate-100 shadow-xl backdrop-blur">
          <p className="font-semibold text-slate-50">{statusLabel}</p>
          <p className="mt-1 text-slate-300">{details}</p>
          <p className="mt-2 text-slate-400">{metricSummary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                enableSafeMode();
                setOpen(false);
              }}
              className="rounded-md border border-emerald-400/70 bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-500/20"
            >
              Force on
            </button>
            <button
              type="button"
              onClick={() => {
                disableSafeMode();
                setOpen(false);
              }}
              className="rounded-md border border-rose-500/60 bg-rose-500/10 px-2 py-1 font-semibold text-rose-100 transition hover:border-rose-300 hover:bg-rose-500/20"
            >
              Force off
            </button>
            <button
              type="button"
              onClick={() => {
                resetOverride();
                setOpen(false);
              }}
              className="rounded-md border border-sky-500/60 bg-sky-500/10 px-2 py-1 font-semibold text-sky-100 transition hover:border-sky-300 hover:bg-sky-500/20"
            >
              Auto
            </button>
            <button
              type="button"
              onClick={() => {
                clearTrigger();
                setOpen(false);
              }}
              className="rounded-md border border-slate-600/60 bg-slate-800/60 px-2 py-1 font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800/80"
            >
              Clear alert
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SafeModeIndicator;
