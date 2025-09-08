import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useClickOutside } from '../../hooks/useClickOutside';
import useRovingTabIndex from '../../hooks/useRovingTabIndex';
import usePersistentState from '../../hooks/usePersistentState';

const pad = (n) => n.toString().padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Clock({ onlyTime, onlyDay }) {
  const [now, setNow] = useState(new Date());
  const [timezone, setTimezone] = usePersistentState(
    'clock:timezone',
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [twentyFourHour, setTwentyFourHour] = usePersistentState('clock:24h', true);
  const [showSeconds, setShowSeconds] = usePersistentState('clock:seconds', false);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);

  useClickOutside(menuRef, () => setOpen(false));
  useRovingTabIndex(menuRef, open, 'vertical');

  // update time
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = setInterval(update, showSeconds ? 1000 : 10000);
    return () => clearInterval(interval);
  }, [showSeconds]);

  // sync with settings page
  useEffect(() => {
    const onTz = (e) => setTimezone(e.detail);
    const on24 = (e) => setTwentyFourHour(e.detail);
    const onSec = (e) => setShowSeconds(e.detail);
    window.addEventListener('clock-timezone', onTz);
    window.addEventListener('clock-24h', on24);
    window.addEventListener('clock-seconds', onSec);
    return () => {
      window.removeEventListener('clock-timezone', onTz);
      window.removeEventListener('clock-24h', on24);
      window.removeEventListener('clock-seconds', onSec);
    };
  }, [setTimezone, setTwentyFourHour, setShowSeconds]);

  const tzNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  let hour = tzNow.getHours();
  let minute = tzNow.getMinutes();
  let second = tzNow.getSeconds();
  let meridiem = hour < 12 ? 'AM' : 'PM';
  if (!twentyFourHour) {
    hour = hour % 12 || 12;
  }
  const timeString =
    (twentyFourHour ? pad(hour) : hour) +
    ':' +
    pad(minute) +
    (showSeconds ? ':' + pad(second) : '') +
    (twentyFourHour ? '' : ` ${meridiem}`);

  const day = DAYS[tzNow.getDay()];
  const month = MONTHS[tzNow.getMonth()];
  const date = tzNow.getDate().toLocaleString();

  const display = onlyTime
    ? timeString
    : onlyDay
    ? `${day} ${month} ${date}`
    : `${day} ${month} ${date} ${timeString}`;

  const toggle24 = () => {
    const val = !twentyFourHour;
    setTwentyFourHour(val);
    window.dispatchEvent(new CustomEvent('clock-24h', { detail: val }));
  };
  const toggleSeconds = () => {
    const val = !showSeconds;
    setShowSeconds(val);
    window.dispatchEvent(new CustomEvent('clock-seconds', { detail: val }));
  };

  useEffect(() => {
    if (open && menuRef.current) {
      const first = menuRef.current.querySelector('[role="menuitem"], [role="menuitemcheckbox"]');
      first && first.focus();
    }
  }, [open]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative inline-block" onKeyDown={handleKeyDown}>
      <span
        data-testid="panel-clock"
        suppressHydrationWarning
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer"
      >
        {display}
      </span>
      {open && (
        <div
          role="menu"
          aria-label="Clock menu"
          className="absolute right-0 mt-2 w-48 bg-neutral-900 text-white rounded shadow-lg z-50"
        >
          <button
            role="menuitemcheckbox"
            aria-checked={twentyFourHour}
            onClick={toggle24}
            className="flex justify-between w-full px-2 py-1 text-left hover:bg-neutral-700"
          >
            <span>24-hour</span>
            {twentyFourHour && <span>✓</span>}
          </button>
          <button
            role="menuitemcheckbox"
            aria-checked={showSeconds}
            onClick={toggleSeconds}
            className="flex justify-between w-full px-2 py-1 text-left hover:bg-neutral-700"
          >
            <span>Show seconds</span>
            {showSeconds && <span>✓</span>}
          </button>
          <Link
            role="menuitem"
            href="/apps/settings/date-time"
            className="block px-2 py-1 hover:bg-neutral-700 text-left"
          >
            Date/Time settings
          </Link>
        </div>
      )}
    </div>
  );
}
