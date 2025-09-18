"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect } from 'react';
import { useSettings, DndSchedule } from '../../hooks/useSettings';

interface Props {
  open: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const describeSchedule = (schedule: DndSchedule) => {
  if (schedule.label && schedule.label.trim()) return schedule.label;
  const sortedDays = [...schedule.days].sort((a, b) => a - b);
  const daySummary =
    sortedDays.length === 7
      ? 'Daily'
      : sortedDays.length
        ? sortedDays.map(day => DAY_LABELS[day] ?? '').filter(Boolean).join(', ')
        : 'Custom';
  return `${daySummary} ${schedule.start}–${schedule.end}`;
};

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const { dndEnabled, setDndEnabled, dndSchedules, setDndSchedules } = useSettings();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

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
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
      <div className="mt-4 border-t border-black border-opacity-20 pt-3 px-4 space-y-2">
        <div className="flex justify-between items-center">
          <span>Do Not Disturb</span>
          <input
            type="checkbox"
            checked={dndEnabled}
            onChange={() => setDndEnabled(!dndEnabled)}
            aria-label="Toggle do not disturb"
          />
        </div>
        <div className="space-y-1">
          {dndSchedules.length === 0 ? (
            <p className="text-xs text-ubt-grey">No quiet hours configured.</p>
          ) : (
            dndSchedules.map(schedule => (
              <label
                key={schedule.id}
                className="flex justify-between items-center text-xs gap-2"
              >
                <span>{describeSchedule(schedule)}</span>
                <input
                  type="checkbox"
                  checked={schedule.enabled}
                  disabled={!dndEnabled}
                  onChange={() =>
                    setDndSchedules(prev =>
                      prev.map(entry =>
                        entry.id === schedule.id
                          ? { ...entry, enabled: !entry.enabled }
                          : entry
                      )
                    )
                  }
                  aria-label={`Toggle schedule ${describeSchedule(schedule)}`}
                />
              </label>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default QuickSettings;
