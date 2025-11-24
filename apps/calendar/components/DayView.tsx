'use client';

import { useMemo } from 'react';
import type { CalendarEvent } from '../types';
import {
  formatDateFull,
  formatTimeRange,
  getCategoryClass,
  getEventsForDate,
  isSameDay,
  startOfDay,
} from '../utils';

interface DayViewProps {
  focusDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
}

export default function DayView({
  focusDate,
  events,
  onSelectEvent,
}: DayViewProps) {
  const today = startOfDay(new Date());
  const dayEvents = useMemo(
    () => getEventsForDate(focusDate, events),
    [focusDate, events],
  );
  const isToday = isSameDay(focusDate, today);

  return (
    <section aria-label="Day view" className="overflow-hidden rounded border border-white/10 bg-black/30">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/10 px-4 py-3">
        <div>
          <div className="text-lg font-semibold text-white">
            {formatDateFull(focusDate)}
          </div>
          <div className="text-sm text-white/70">
            {dayEvents.length > 0
              ? `${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`
              : 'No events scheduled'}
          </div>
        </div>
        {isToday && (
          <span className="rounded-full bg-blue-500/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
            Today
          </span>
        )}
      </header>
      <div className="space-y-3 p-4">
        {dayEvents.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelectEvent(event)}
            className={`w-full rounded border px-3 py-3 text-left text-sm text-white transition ${getCategoryClass(
              event.category,
            )} focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-base font-semibold leading-tight">
                {event.title}
              </span>
              <span className="text-xs text-white/80">
                {formatTimeRange(event.start, event.end)}
              </span>
            </div>
            {event.location && (
              <div className="mt-1 text-xs uppercase tracking-wide text-white/70">
                {event.location}
              </div>
            )}
            {event.description && (
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                {event.description}
              </p>
            )}
          </button>
        ))}
        {dayEvents.length === 0 && (
          <div className="rounded border border-dashed border-white/20 px-4 py-6 text-center text-sm text-white/60">
            Enjoy a clear schedule. Use the navigation controls above to explore
            other days.
          </div>
        )}
      </div>
    </section>
  );
}
