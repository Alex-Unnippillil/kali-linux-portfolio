'use client';

import { useMemo, useState } from 'react';
import AgendaList from './components/AgendaList';
import MonthGrid from './components/MonthGrid';
import ViewToolbar from './components/ViewToolbar';
import WeekAgenda from './components/WeekAgenda';
import {
  addDays,
  addMonths,
  addWeeks,
  dateKey,
  daysBetween,
  formatDate,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from './date-utils';
import { mockEvents } from './mock-data';
import { CalendarEvent, CalendarView } from './types';

const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

function normalizeForView(date: Date, view: CalendarView): Date {
  if (view === 'month') {
    return startOfMonth(date);
  }
  if (view === 'week') {
    return startOfWeek(date);
  }
  return startOfDay(date);
}

export default function CalendarApp() {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [referenceDate, setReferenceDate] = useState<Date>(normalizeForView(today, 'month'));

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    mockEvents.forEach((event) => {
      const days = daysBetween(event.start, event.end);
      for (let offset = 0; offset <= Math.max(0, days); offset += 1) {
        const day = addDays(startOfDay(event.start), offset);
        const key = dateKey(day);
        if (!map[key]) {
          map[key] = [];
        }
        map[key].push(event);
      }
    });
    return map;
  }, []);

  const handleSelectDate = (date: Date) => {
    const normalized = startOfDay(date);
    setSelectedDate(normalized);
    setReferenceDate(normalizeForView(normalized, view));
  };

  const handleViewChange = (nextView: CalendarView) => {
    setView(nextView);
    setReferenceDate(normalizeForView(selectedDate, nextView));
  };

  const moveView = (direction: number) => {
    setSelectedDate((current) => {
      let next: Date;
      if (view === 'month') {
        next = addMonths(current, direction);
      } else if (view === 'week') {
        next = addWeeks(current, direction);
      } else {
        next = addDays(current, direction * 7);
      }
      setReferenceDate(normalizeForView(next, view));
      return next;
    });
  };

  const goToToday = () => {
    setSelectedDate(today);
    setReferenceDate(normalizeForView(today, view));
  };

  const viewLabel = useMemo(() => {
    if (view === 'month') {
      return formatDate(referenceDate, { month: 'long', year: 'numeric' }, locale);
    }
    if (view === 'week') {
      const start = startOfWeek(referenceDate);
      const end = addDays(start, 6);
      const startLabel = formatDate(start, { month: 'short', day: 'numeric' }, locale);
      const endLabel = formatDate(end, { month: 'short', day: 'numeric' }, locale);
      const yearLabel = formatDate(end, { year: 'numeric' }, locale);
      return `${startLabel} – ${endLabel} ${yearLabel}`;
    }
    return `Agenda • ${formatDate(referenceDate, { month: 'long', year: 'numeric' }, locale)}`;
  }, [referenceDate, view]);

  const selectedEvents = eventsByDate[dateKey(selectedDate)] ?? [];

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-950 p-4 text-white">
      <ViewToolbar
        label={viewLabel}
        onPrev={() => moveView(-1)}
        onNext={() => moveView(1)}
        onToday={goToToday}
        view={view}
        onViewChange={handleViewChange}
      />
      {view === 'month' && (
        <MonthGrid
          referenceDate={referenceDate}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          eventsByDate={eventsByDate}
        />
      )}
      {view === 'week' && (
        <WeekAgenda
          referenceDate={referenceDate}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          eventsByDate={eventsByDate}
        />
      )}
      {view === 'agenda' && (
        <AgendaList
          events={mockEvents}
          onSelectDate={handleSelectDate}
          selectedDate={selectedDate}
        />
      )}
      <section className="mt-6 rounded border border-slate-700 bg-slate-900 p-4">
        <h2 className="text-lg font-semibold">
          {formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' }, locale)}
        </h2>
        {selectedEvents.length === 0 ? (
          <p className="mt-2 text-slate-300">No events planned for this day.</p>
        ) : (
          <ul className="mt-3 space-y-3 text-sm">
            {selectedEvents
              .slice()
              .sort((a, b) => a.start.getTime() - b.start.getTime())
              .map((event) => (
                <li key={event.id} className="rounded bg-slate-800 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-xs text-slate-300">
                      {formatDate(event.start, { hour: 'numeric', minute: '2-digit' }, locale)} –
                      {` ${formatDate(event.end, { hour: 'numeric', minute: '2-digit' }, locale)}`}
                    </span>
                  </div>
                  {event.location && (
                    <div className="mt-1 text-xs text-slate-400">{event.location}</div>
                  )}
                  {event.description && (
                    <p className="mt-2 text-slate-200">{event.description}</p>
                  )}
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}
