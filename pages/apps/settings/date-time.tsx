import ToggleSwitch from '../../../components/ToggleSwitch';
import { useSettings } from '../../../hooks/useSettings';
import usePersistentState from '../../../hooks/usePersistentState';
import CommandChip from '../../../components/ui/CommandChip';
import type { ChangeEvent } from 'react';

export default function DateTimeSettings() {
  const { networkTime, setNetworkTime } = useSettings();

  const [timezone, setTimezone] = usePersistentState<string>(
    'clock:timezone',
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [twentyFourHour, setTwentyFourHour] = usePersistentState<boolean>(
    'clock:24h',
    true,
  );
  const [showSeconds, setShowSeconds] = usePersistentState<boolean>(
    'clock:seconds',
    false,
  );
  const [firstDay, setFirstDay] = usePersistentState<number>(
    'clock:first-day',
    0,
  );

  const tzList =
    typeof Intl.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : [Intl.DateTimeFormat().resolvedOptions().timeZone];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const tooltip = `Network Time Protocol (NTP) keeps your clock in sync using chrony.\nCommands:\n  sudo apt install chrony\n  sudo systemctl enable --now chrony`;

  const handleTimezone = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTimezone(value);
    window.dispatchEvent(new CustomEvent('clock-timezone', { detail: value }));
  };

  const handleTwentyFourHour = (val: boolean) => {
    setTwentyFourHour(val);
    window.dispatchEvent(new CustomEvent('clock-24h', { detail: val }));
  };

  const handleShowSeconds = (val: boolean) => {
    setShowSeconds(val);
    window.dispatchEvent(new CustomEvent('clock-seconds', { detail: val }));
  };

  const handleFirstDay = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value, 10);
    setFirstDay(value);
    window.dispatchEvent(new CustomEvent('clock-first-day', { detail: value }));
  };

  return (
    <div className="p-4 text-ubt-grey">
      <h1 className="text-xl mb-4">Date &amp; Time</h1>
      <div className="flex items-center gap-2 mb-4">
        <label htmlFor="timezone" className="w-36">
          Time zone
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={handleTimezone}
          className="flex-1 bg-ub-cool-grey text-ubt-grey p-1 rounded"
        >
          {tzList.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-36">24-hour time</span>
        <ToggleSwitch
          checked={twentyFourHour}
          onChange={handleTwentyFourHour}
          ariaLabel="toggle-24-hour"
        />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-36">Show seconds</span>
        <ToggleSwitch
          checked={showSeconds}
          onChange={handleShowSeconds}
          ariaLabel="toggle-seconds"
        />
      </div>
      <div className="flex items-center gap-2 mb-4">
        <label htmlFor="first-day" className="w-36">
          First day of week
        </label>
        <select
          id="first-day"
          value={firstDay}
          onChange={handleFirstDay}
          className="flex-1 bg-ub-cool-grey text-ubt-grey p-1 rounded"
        >
          {days.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <span>Use network time (NTP)</span>
        <ToggleSwitch
          checked={networkTime}
          onChange={setNetworkTime}
          ariaLabel="use-network-time"
        />
        <span className="cursor-help" title={tooltip} aria-label="NTP info">ℹ️</span>
      </div>
      <div className="space-y-2" aria-label="NTP commands">
        <CommandChip command="sudo apt install chrony" />
        <CommandChip command="sudo systemctl enable --now chrony" />
      </div>
    </div>
  );
}
