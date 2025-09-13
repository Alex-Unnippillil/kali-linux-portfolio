'use client';

import { useState, useEffect, useRef } from 'react';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PanelClock() {
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedIdx, setFocusedIdx] = useState(-1);

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

  useEffect(() => {
    if (open) {
      const index = weeks
        .flat()
        .findIndex((d) => d === now?.getDate());
      const firstValid = weeks.flat().findIndex((d) => d !== null);
      const idx = index >= 0 ? index : firstValid;
      setFocusedIdx(idx);
      // focus will be applied in effect below
    }
  }, [open]);

  useEffect(() => {
    if (open && focusedIdx >= 0) {
      dayRefs.current[focusedIdx]?.focus();
    }
  }, [open, focusedIdx]);

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

  const total = 42;
  const move = (delta: number) => {
    let idx = focusedIdx;
    do {
      idx = (idx + delta + total) % total;
    } while (!dayRefs.current[idx]);
    setFocusedIdx(idx);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        move(1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        move(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        move(7);
        break;
      case 'ArrowUp':
        e.preventDefault();
        move(-7);
        break;
      case 'Enter':
        e.preventDefault();
        dayRefs.current[focusedIdx]?.click();
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        e.preventDefault();
        move(e.shiftKey ? -1 : 1);
        break;
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title={tooltip}
        onClick={() => setOpen((o) => !o)}
        className="outline-none"
        ref={buttonRef}
      >
        {timeStr}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 p-2 bg-ub-grey text-ubt-grey rounded shadow-lg"
          onKeyDown={handleKey}
        >
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
                  {week.map((d, i) => {
                    const cellIndex = idx * 7 + i;
                    const label = d
                      ? new Date(year, month, d).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : undefined;
                    if (!d) {
                      dayRefs.current[cellIndex] = null;
                      return (
                        <td key={i} className="p-1 text-center">
                          <span />
                        </td>
                      );
                    }
                    return (
                      <td key={i} className="p-1 text-center">
                        <button
                          ref={(el) => {
                            dayRefs.current[cellIndex] = el;
                          }}
                          tabIndex={cellIndex === focusedIdx ? 0 : -1}
                          aria-label={label}
                          className={`w-6 h-6 rounded ${
                            d === now.getDate()
                              ? 'bg-ubt-blue text-ub-grey'
                              : ''
                          }`}
                        >
                          {d}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

