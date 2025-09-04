'use client';

import { useState, useEffect, useRef } from 'react';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PanelClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, [open]);

  if (!now) return <span suppressHydrationWarning />;

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const tooltip = now.toLocaleString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let day = 1 - firstDay;
  for (let i = 0; i < 6; i++) {
    const week: (number | null)[] = [];
    for (let j = 0; j < 7; j++) {
      if (day < 1 || day > daysInMonth) week.push(null);
      else week.push(day);
      day++;
    }
    weeks.push(week);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={tooltip}
        onClick={() => setOpen(!open)}
        className="outline-none"
      >
        {timeStr}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 p-2 bg-ub-grey text-ubt-grey rounded shadow-lg">
          <div className="text-center mb-2">
            {now.toLocaleString([], { month: 'long', year: 'numeric' })}
          </div>
          <table className="text-xs">
            <thead>
              <tr>
                {dayNames.map((d) => (
                  <th key={d} className="px-1">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, idx) => (
                <tr key={idx}>
                  {week.map((d, i) => (
                    <td
                      key={i}
                      className={`p-1 text-center ${
                        d === now.getDate() ? 'bg-ubt-blue text-ub-grey rounded' : ''
                      }`}
                    >
                      {d ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

