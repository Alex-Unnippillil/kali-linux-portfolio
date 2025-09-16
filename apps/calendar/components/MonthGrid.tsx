import { useEffect, useMemo, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import {
  addDays,
  dateKey,
  formatDate,
  getMonthMatrix,
  isSameDay,
  isSameMonth,
  parseDateKey,
  startOfDay,
} from '../date-utils';
import { CalendarEvent } from '../types';

interface MonthGridProps {
  referenceDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  eventsByDate: Record<string, CalendarEvent[]>;
}

const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

export default function MonthGrid({
  referenceDate,
  selectedDate,
  onSelectDate,
  eventsByDate,
}: MonthGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => startOfDay(new Date()), []);

  const weeks = useMemo(() => getMonthMatrix(referenceDate), [referenceDate]);
  const headerDates = useMemo(() => {
    const firstWeek = weeks[0] ?? [];
    return firstWeek.map((day) =>
      formatDate(day, { weekday: 'short' }, locale).toUpperCase(),
    );
  }, [weeks]);

  useEffect(() => {
    const key = dateKey(selectedDate);
    const button = gridRef.current?.querySelector<HTMLButtonElement>(
      `[data-date="${key}"]`,
    );
    if (button && document.activeElement !== button) {
      button.focus();
    }
  }, [selectedDate]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const dataset = event.currentTarget.dataset.date;
    const currentDate = dataset ? parseDateKey(dataset) : selectedDate;
    let nextDate: Date | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        nextDate = addDays(currentDate, -1);
        break;
      case 'ArrowRight':
        nextDate = addDays(currentDate, 1);
        break;
      case 'ArrowUp':
        nextDate = addDays(currentDate, -7);
        break;
      case 'ArrowDown':
        nextDate = addDays(currentDate, 7);
        break;
      case 'Home':
        nextDate = addDays(currentDate, -currentDate.getDay());
        break;
      case 'End':
        nextDate = addDays(currentDate, 6 - currentDate.getDay());
        break;
      default:
        break;
    }

    if (nextDate) {
      event.preventDefault();
      onSelectDate(startOfDay(nextDate));
    }
  };

  return (
    <div
      className="mt-4 overflow-hidden rounded border border-slate-700 text-white"
      role="grid"
      aria-label="Monthly calendar"
      ref={gridRef}
    >
      <div className="grid grid-cols-7 bg-slate-800 text-center text-xs uppercase tracking-wide text-slate-200">
        {headerDates.map((label) => (
          <div key={label} role="columnheader" className="px-2 py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-800">
        {weeks.map((week, rowIndex) => (
          <div key={`week-${rowIndex}`} role="row" className="contents">
            {week.map((day) => {
              const key = dateKey(day);
              const events = eventsByDate[key] ?? [];
              const inMonth = isSameMonth(day, referenceDate);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={key}
                  role="gridcell"
                  aria-selected={isSelected}
                  className={`min-h-[5.5rem] bg-slate-900 p-2 text-sm transition ${
                    inMonth ? 'text-white' : 'text-slate-500'
                  } ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-800' : ''}`}
                >
                  <button
                    type="button"
                    data-date={key}
                    tabIndex={isSelected ? 0 : -1}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold focus:outline-none focus:ring ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : isSelected
                        ? 'bg-slate-700'
                        : 'hover:bg-slate-700'
                    }`}
                    aria-label={`${formatDate(day, { weekday: 'long' }, locale)} ${formatDate(
                      day,
                      { month: 'long', day: 'numeric' },
                      locale,
                    )}`}
                    onClick={() => onSelectDate(startOfDay(day))}
                    onKeyDown={handleKeyDown}
                  >
                    {day.getDate()}
                  </button>
                  <ul className="mt-2 space-y-1">
                    {events.slice(0, 2).map((event) => (
                      <li
                        key={event.id}
                        className="truncate rounded bg-slate-700/60 px-2 py-1 text-xs"
                        title={`${event.title} (${formatDate(event.start, { hour: 'numeric', minute: '2-digit' }, locale)})`}
                      >
                        <span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-400 align-middle" aria-hidden="true" />
                        {event.title}
                      </li>
                    ))}
                    {events.length > 2 && (
                      <li className="text-xs text-slate-300">+{events.length - 2} more</li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
