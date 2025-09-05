"use client";

import { useEffect, useState } from 'react';

const dayList = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthList = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatWithStrftime(date, format, timeZone) {
  const zoned = new Date(
    date.toLocaleString('en-US', { timeZone }),
  );
  const map = {
    '%Y': zoned.getFullYear().toString(),
    '%m': String(zoned.getMonth() + 1).padStart(2, '0'),
    '%d': String(zoned.getDate()).padStart(2, '0'),
    '%H': String(zoned.getHours()).padStart(2, '0'),
    '%M': String(zoned.getMinutes()).padStart(2, '0'),
    '%S': String(zoned.getSeconds()).padStart(2, '0'),
    '%a': dayList[zoned.getDay()],
    '%b': monthList[zoned.getMonth()],
    '%p': zoned.getHours() < 12 ? 'AM' : 'PM',
    '%I': String(((zoned.getHours() + 11) % 12) + 1).padStart(2, '0'),
  };
  return format.replace(/%[YmdHMSabpI]/g, (token) => map[token] || token);
}

export default function Clock({
  timezone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  format,
  label,
  onlyTime,
  onlyDay,
}) {
  const defaultFormat = onlyTime
    ? '%I:%M %p'
    : onlyDay
      ? '%a %b %d'
      : '%a %b %d %I:%M %p';
  const fmt = format || defaultFormat;

  const [now, setNow] = useState(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    let worker;
    let timer;
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
      worker = new Worker(new URL('../../workers/timer.worker.ts', import.meta.url));
      worker.onmessage = update;
      worker.postMessage({ action: 'start', interval: 1000 });
    } else {
      timer = setInterval(update, 1000);
    }
    return () => {
      if (worker) {
        worker.postMessage({ action: 'stop' });
        worker.terminate();
      }
      if (timer) clearInterval(timer);
    };
  }, []);

  if (!now) return <span suppressHydrationWarning></span>;

  const text = formatWithStrftime(now, fmt, timezone);
  const display = label ? `${label} ${text}` : text;

  return <span suppressHydrationWarning>{display}</span>;
}

