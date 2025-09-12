"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const [warmTone, setWarmTone] = usePersistentState('qs-warm-tone', false);
  const [warmStart, setWarmStart] = usePersistentState('qs-warm-start', '19:00');
  const [warmEnd, setWarmEnd] = usePersistentState('qs-warm-end', '07:00');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  useEffect(() => {
    const applyWarmTone = () => {
      if (!warmTone) {
        document.documentElement.classList.remove('warm-tone');
        return;
      }

      const [startH, startM] = warmStart.split(':').map(Number);
      const [endH, endM] = warmEnd.split(':').map(Number);
      const start = startH * 60 + startM;
      const end = endH * 60 + endM;
      const now = new Date();
      const current = now.getHours() * 60 + now.getMinutes();

      const active =
        start < end
          ? current >= start && current < end
          : current >= start || current < end;

      document.documentElement.classList.toggle('warm-tone', active);
    };

    applyWarmTone();
    const id = setInterval(applyWarmTone, 60 * 1000);
    return () => clearInterval(id);
  }, [warmTone, warmStart, warmEnd]);

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
      <div className="px-4 pb-2 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Warm tone</span>
        <input
          type="checkbox"
          checked={warmTone}
          onChange={() => setWarmTone(!warmTone)}
        />
      </div>
      <div className="px-4 pb-2">
        <div className="flex justify-between pb-2">
          <label htmlFor="warm-start" className="mr-2">
            Start
          </label>
          <input
            id="warm-start"
            type="time"
            value={warmStart}
            onChange={(e) => setWarmStart(e.target.value)}
          />
        </div>
        <div className="flex justify-between">
          <label htmlFor="warm-end" className="mr-2">
            End
          </label>
          <input
            id="warm-end"
            type="time"
            value={warmEnd}
            onChange={(e) => setWarmEnd(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};

export default QuickSettings;
