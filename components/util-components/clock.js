import { useEffect, useRef, useState } from 'react';
import CalendarPopup from './calendar-popup';
import { useClickOutside } from '../../hooks/useClickOutside';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Clock({ onlyTime, onlyDay }) {
  const [currentTime, setCurrentTime] = useState(null);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useClickOutside(ref, () => setOpen(false));

  useEffect(() => {
    const update = () => setCurrentTime(new Date());
    update();
    let worker;
    let interval;
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      worker = new Worker(new URL('../../workers/timer.worker.ts', import.meta.url));
      worker.onmessage = update;
      worker.postMessage({ action: 'start', interval: 10 * 1000 });
    } else {
      interval = setInterval(update, 10 * 1000);
    }
    return () => {
      if (worker) {
        worker.postMessage({ action: 'stop' });
        worker.terminate();
      }
      if (interval) clearInterval(interval);
    };
  }, []);

  if (!currentTime) return <span suppressHydrationWarning></span>;

  let day = DAYS[currentTime.getDay()];
  let hour = currentTime.getHours();
  let minute = currentTime.getMinutes();
  let month = MONTHS[currentTime.getMonth()];
  let date = currentTime.getDate().toLocaleString();
  let meridiem = hour < 12 ? 'AM' : 'PM';

  if (minute.toLocaleString().length === 1) minute = '0' + minute;
  if (hour > 12) hour -= 12;

  let display;
  if (onlyTime) {
    display = `${hour}:${minute} ${meridiem}`;
  } else if (onlyDay) {
    display = `${day} ${month} ${date}`;
  } else {
    display = `${day} ${month} ${date} ${hour}:${minute} ${meridiem}`;
  }

  return (
    <div
      ref={ref}
      tabIndex={0}
      onBlur={() => setOpen(false)}
      className="relative inline-block"
    >
      <span suppressHydrationWarning onClick={() => setOpen(!open)}>{display}</span>
      {open && <CalendarPopup />}
    </div>
  );
}

