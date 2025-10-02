"use client";

import usePersistentState from '../../hooks/usePersistentState';
import { useEffect, ChangeEvent } from 'react';
import { useNotifications } from '../../hooks/useNotifications';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const {
    doNotDisturb,
    setDoNotDisturb,
    quietHours,
    setQuietHours,
    quietHoursActive,
    notificationsMuted,
    mutingReason,
  } = useNotifications();

  const toggleQuietHoursEnabled = () => {
    setQuietHours(prev => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  };

  const handleQuietHoursChange = (key: 'start' | 'end') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (!/^\d{2}:\d{2}$/.test(value)) return;
      setQuietHours(prev => ({
        ...prev,
        [key]: value,
      }));
    };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return time;
    const reference = new Date();
    reference.setHours(hours, minutes, 0, 0);
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(reference);
  };

  const mutingSummary = notificationsMuted
    ? mutingReason === 'both'
      ? 'Do Not Disturb and quiet hours'
      : mutingReason === 'do-not-disturb'
        ? 'Do Not Disturb'
        : 'Quiet hours'
    : 'Notifications on';

  const quietHoursSummary = quietHours.enabled
    ? `${formatTime(quietHours.start)} – ${formatTime(quietHours.end)}${
        quietHoursActive ? ' (active)' : ''
      }`
    : 'Quiet hours disabled';

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
      <div className="px-4 pb-2 flex items-center justify-between">
        <label htmlFor="qs-sound-toggle" className="cursor-pointer">
          Sound
        </label>
        <input
          id="qs-sound-toggle"
          type="checkbox"
          checked={sound}
          onChange={() => setSound(!sound)}
          aria-label="Toggle sound"
        />
      </div>
      <div className="px-4 pb-2 flex items-center justify-between">
        <label htmlFor="qs-network-toggle" className="cursor-pointer">
          Network
        </label>
        <input
          id="qs-network-toggle"
          type="checkbox"
          checked={online}
          onChange={() => setOnline(!online)}
          aria-label="Toggle simulated network"
        />
      </div>
      <div className="px-4 flex items-center justify-between">
        <label htmlFor="qs-reduce-motion-toggle" className="cursor-pointer">
          Reduced motion
        </label>
        <input
          id="qs-reduce-motion-toggle"
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
          aria-label="Toggle reduced motion"
        />
      </div>
      <div className="mt-3 border-t border-white/10 px-4 pt-3 text-sm text-white/90">
        <div className="flex items-center justify-between">
          <label htmlFor="qs-dnd-toggle" className="cursor-pointer">
            Do Not Disturb
          </label>
          <input
            id="qs-dnd-toggle"
            type="checkbox"
            checked={doNotDisturb}
            onChange={() => setDoNotDisturb(prev => !prev)}
            aria-label="Toggle Do Not Disturb"
          />
        </div>
        <p className="mt-2 text-xs text-white/70">
          {notificationsMuted
            ? `Notifications muted (${mutingSummary}).`
            : 'Notifications allowed.'}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <label htmlFor="qs-quiet-hours-toggle" className="cursor-pointer">
            Quiet hours
          </label>
          <input
            id="qs-quiet-hours-toggle"
            type="checkbox"
            checked={quietHours.enabled}
            onChange={toggleQuietHoursEnabled}
            aria-label="Toggle quiet hours"
          />
        </div>
        <div className={`mt-2 grid grid-cols-2 gap-2 text-xs ${quietHours.enabled ? '' : 'opacity-50'}`}>
          <label className="flex flex-col gap-1" htmlFor="qs-quiet-hours-start">
            <span>Start</span>
            <input
              id="qs-quiet-hours-start"
              type="time"
              value={quietHours.start}
              onChange={handleQuietHoursChange('start')}
              disabled={!quietHours.enabled}
              className="rounded border border-white/10 bg-black/20 px-2 py-1 text-white"
              aria-label="Quiet hours start time"
            />
          </label>
          <label className="flex flex-col gap-1" htmlFor="qs-quiet-hours-end">
            <span>End</span>
            <input
              id="qs-quiet-hours-end"
              type="time"
              value={quietHours.end}
              onChange={handleQuietHoursChange('end')}
              disabled={!quietHours.enabled}
              className="rounded border border-white/10 bg-black/20 px-2 py-1 text-white"
              aria-label="Quiet hours end time"
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-white/60">
          {quietHoursSummary}
        </p>
      </div>
    </div>
  );
};

export default QuickSettings;
