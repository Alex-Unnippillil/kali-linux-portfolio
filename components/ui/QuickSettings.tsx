"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useCallback, useEffect, useState } from 'react';
import {
  SCHEDULER_EVENT,
  getPendingDeferredRestart,
  type ScheduledRestart,
} from '../../utils/updateScheduler';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const [deferredRestart, setDeferredRestart] = useState<ScheduledRestart | null>(null);

  const refreshDeferredRestart = useCallback(async () => {
    try {
      const restart = await getPendingDeferredRestart();
      setDeferredRestart(restart);
    } catch {
      setDeferredRestart(null);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    void refreshDeferredRestart();
  }, [refreshDeferredRestart]);

  useEffect(() => {
    if (!open) return;
    void refreshDeferredRestart();
  }, [open, refreshDeferredRestart]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = () => {
      void refreshDeferredRestart();
    };
    window.addEventListener(SCHEDULER_EVENT, handler);
    return () => window.removeEventListener(SCHEDULER_EVENT, handler);
  }, [refreshDeferredRestart]);

  let deferredTimeLabel = '';
  if (deferredRestart) {
    const date = new Date(deferredRestart.scheduledTime);
    deferredTimeLabel = Number.isNaN(date.getTime())
      ? 'soon'
      : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      {deferredRestart && (
        <div className="px-4 pb-3">
          <div className="rounded border border-yellow-800 bg-yellow-900/60 p-3 text-xs text-yellow-100">
            <p className="font-semibold">Deferred restart pending</p>
            <p className="mt-1 leading-relaxed">
              {deferredRestart.label} is rescheduled for {deferredTimeLabel}. Open the Update Center to
              choose a different window.
            </p>
          </div>
        </div>
      )}
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
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
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
