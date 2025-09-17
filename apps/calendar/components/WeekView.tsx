'use client';

import { useMemo } from 'react';
import type { CalendarEvent } from '../types';
import {
  addDays,
  compareEvents,
  formatDayHeader,
  formatTimeRange,
  getCategoryClass,
  isEventOnDay,
  isSameDay,
  startOfDay,
  startOfWeek,
  WEEK_START,
} from '../utils';

interface WeekViewProps {
  focusDate: Date;
  selectedDate: Date;
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
}

export default function WeekView({
  focusDate,
  selectedDate,
  events,
  onSelectDate,
  onSelectEvent,
}: WeekViewProps) {
  const today = startOfDay(new Date());

  const weekDays = useMemo(() => {
    const start = startOfWeek(focusDate, WEEK_START);
    return Array.from({ length: 7 }, (_, idx) => addDays(start, idx));
  }, [focusDate]);

  return (
    <section aria-label="Week view" className="overflow-hidden rounded border border-white/10">
      <div className="grid grid-cols-7 divide-x divide-white/10 border-b border-white/10 bg-white/10 text-[0.75rem] uppercase tracking-wide text-white/70">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`flex h-full w-full items-center justify-between px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                isSelected ? 'bg-blue-500/40 text-white' : 'text-white/80 hover:bg-white/10'
              }`}
            >
              <span>{formatDayHeader(day)}</span>
              {isToday && (
                <span className="ml-2 rounded-full bg-blue-500/30 px-2 text-[0.6rem] font-semibold uppercase tracking-wider text-blue-100">
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-7 divide-x divide-white/10 bg-black/30">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const dayEvents = events
            .filter((event) => isEventOnDay(event, day))
            .sort(compareEvents);

          return (
            <div
              key={day.getTime()}
              className={`min-h-[14rem] p-3 ${
                isSelected ? 'bg-blue-500/10' : ''
              }`}
            >
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className={`w-full rounded border px-2 py-2 text-left text-sm ${getCategoryClass(
                      event.category,
                    )} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
                  >
                    <div className="flex items-start justify-between gap-2 text-white">
                      <span className="font-semibold leading-tight">
                        {event.title}
                      </span>
                      <span className="text-xs text-white/80">
                        {formatTimeRange(event.start, event.end)}
                      </span>
                    </div>
                    {event.location && (
                      <div className="mt-1 text-xs text-white/70">
                        {event.location}
                      </div>
                    )}
                  </button>
                ))}
                {dayEvents.length === 0 && (
                  <div className="rounded border border-dashed border-white/20 px-2 py-6 text-center text-xs text-white/60">
                    No events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
