'use client';

import { useMemo } from 'react';
import type { CalendarEvent } from '../types';
import {
  addDays,
  compareEvents,
  formatTimeRange,
  formatWeekday,
  getCategoryClass,
  isEventOnDay,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  WEEK_START,
} from '../utils';

interface MonthViewProps {
  focusDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

interface MonthCell {
  date: Date;
  events: CalendarEvent[];
}

export default function MonthView({
  focusDate,
  selectedDate,
  events,
  onSelectDate,
  onSelectEvent,
}: MonthViewProps) {
  const today = startOfDay(new Date());

  const weekdayLabels = useMemo(() => {
    const start = startOfWeek(focusDate, WEEK_START);
    return Array.from({ length: 7 }, (_, idx) =>
      formatWeekday(addDays(start, idx)),
    );
  }, [focusDate]);

  const weeks = useMemo(() => {
    const firstOfMonth = startOfMonth(focusDate);
    const gridStart = startOfWeek(firstOfMonth, WEEK_START);
    const result: MonthCell[][] = [];
    let cursor = gridStart;

    for (let week = 0; week < 6; week += 1) {
      const row: MonthCell[] = [];
      for (let day = 0; day < 7; day += 1) {
        const cellDate = cursor;
        const dailyEvents = events
          .filter((event) => isEventOnDay(event, cellDate))
          .sort(compareEvents);
        row.push({ date: cellDate, events: dailyEvents });
        cursor = addDays(cursor, 1);
      }
      result.push(row);
    }

    return result;
  }, [events, focusDate]);

  return (
    <section aria-label="Month view" className="space-y-2">
      <div className="grid grid-cols-7 gap-px rounded border border-white/10 bg-white/10 text-[0.7rem] uppercase tracking-wide text-white/70">
        {weekdayLabels.map((label) => (
          <div key={label} className="px-2 py-1 text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded border border-white/10">
        <div className="grid grid-cols-7">
          {weeks.flatMap((week) =>
            week.map(({ date, events: dayEvents }) => {
              const key = date.getTime();
              const selected = isSameDay(date, selectedDate);
              const currentMonth = isSameMonth(date, focusDate);
              const isToday = isSameDay(date, today);

              const baseClasses = [
                'flex h-full min-h-[6.5rem] flex-col border border-transparent bg-black/30 p-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
                currentMonth ? '' : 'opacity-60',
                selected ? 'border-blue-400/70 bg-blue-500/20 shadow-inner' : 'hover:bg-white/10',
                isToday && !selected
                  ? 'ring-1 ring-inset ring-blue-400/70'
                  : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <button
                  key={key}
                  type="button"
                  className={baseClasses}
                  onClick={() => onSelectDate(date)}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`text-lg font-semibold ${
                        isToday ? 'text-blue-100' : ''
                      }`}
                    >
                      {date.getDate()}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-blue-500/30 px-2 text-[0.6rem] font-semibold uppercase tracking-wider text-blue-100">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className={`w-full rounded border px-1 py-1 text-left text-xs ${getCategoryClass(
                          event.category,
                        )} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
                        onClick={(evt) => {
                          evt.stopPropagation();
                          onSelectEvent(event);
                        }}
                      >
                        <div className="truncate font-medium text-white">
                          {event.title}
                        </div>
                        <div className="text-[0.65rem] text-white/80">
                          {formatTimeRange(event.start, event.end)}
                        </div>
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[0.65rem] text-white/70">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              );
            }),
          )}
        </div>
      </div>
    </section>
  );
}
