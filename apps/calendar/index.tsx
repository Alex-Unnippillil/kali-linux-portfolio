'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import MonthView from './components/MonthView';
import WeekView from './components/WeekView';
import DayView from './components/DayView';
import EventDetail from './components/EventDetail';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import { sampleEvents } from './sampleEvents';
import type { CalendarEvent, CalendarView } from './types';
import {
  addDays,
  compareEvents,
  endOfView,
  formatDateFull,
  formatViewLabel,
  getEventsForDate,
  isEventOnDay,
  moveByView,
  startOfDay,
  startOfView,
} from './utils';

const viewOptions: { id: CalendarView; label: string }[] = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
];

export default function CalendarApp() {
  const [view, setView] = useState<CalendarView>('month');
  const [focusDate, setFocusDate] = useState(() => startOfDay(new Date()));

  const events = useMemo<CalendarEvent[]>(
    () =>
      sampleEvents
        .map((event) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end),
        }))
        .sort(compareEvents),
    [],
  );

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const focusDayEvents = useMemo(
    () => getEventsForDate(focusDate, events),
    [focusDate, events],
  );

  useEffect(() => {
    setSelectedEvent((current) => {
      if (current && isEventOnDay(current, focusDate)) {
        return current;
      }
      return focusDayEvents[0] ?? null;
    });
  }, [focusDate, focusDayEvents]);

  const handleSelectDate = useCallback((date: Date) => {
    setFocusDate(startOfDay(date));
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setFocusDate(startOfDay(event.start));
    setSelectedEvent(event);
  }, []);

  const goToToday = useCallback(() => {
    const today = startOfDay(new Date());
    setFocusDate(today);
    setSelectedEvent((current) =>
      current && isEventOnDay(current, today) ? current : null,
    );
  }, []);

  const goToPrevious = useCallback(() => {
    setFocusDate((prev) => moveByView(prev, view, -1));
  }, [view]);

  const goToNext = useCallback(() => {
    setFocusDate((prev) => moveByView(prev, view, 1));
  }, [view]);

  const handleViewChange = useCallback((nextView: CalendarView) => {
    setView(nextView);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.defaultPrevented) return;

      const key = event.key;
      if (key === 'ArrowLeft') {
        event.preventDefault();
        setFocusDate((prev) => addDays(prev, -1));
        return;
      }
      if (key === 'ArrowRight') {
        event.preventDefault();
        setFocusDate((prev) => addDays(prev, 1));
        return;
      }
      if (key === 'ArrowUp') {
        event.preventDefault();
        setFocusDate((prev) =>
          addDays(prev, view === 'month' ? -7 : -1),
        );
        return;
      }
      if (key === 'ArrowDown') {
        event.preventDefault();
        setFocusDate((prev) =>
          addDays(prev, view === 'month' ? 7 : 1),
        );
        return;
      }
      if (key === 'PageUp') {
        event.preventDefault();
        setFocusDate((prev) => moveByView(prev, view, -1));
        return;
      }
      if (key === 'PageDown') {
        event.preventDefault();
        setFocusDate((prev) => moveByView(prev, view, 1));
        return;
      }
      if (key === 'Home') {
        event.preventDefault();
        setFocusDate((prev) => startOfView(prev, view));
        return;
      }
      if (key === 'End') {
        event.preventDefault();
        setFocusDate((prev) => startOfDay(endOfView(prev, view)));
        return;
      }
      if (key === 't' || key === 'T') {
        event.preventDefault();
        goToToday();
        return;
      }
      if (key === 'm' || key === 'M') {
        event.preventDefault();
        setView('month');
        return;
      }
      if (key === 'w' || key === 'W') {
        event.preventDefault();
        setView('week');
        return;
      }
      if (key === 'd' || key === 'D') {
        event.preventDefault();
        setView('day');
      }
    },
    [goToToday, view],
  );

  const focusLabel = useMemo(
    () => formatViewLabel(focusDate, view),
    [focusDate, view],
  );

  return (
    <div
      className="flex h-full flex-col overflow-hidden bg-gradient-to-b from-black/50 to-black/30 text-white"
      role="application"
      aria-label="Calendar"
      aria-describedby="calendar-shortcuts"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-3">
        <div>
          <h1 className="text-xl font-semibold">{focusLabel}</h1>
          <p className="text-sm text-white/70">{formatDateFull(focusDate)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded border border-white/20 px-3 py-1.5 text-sm font-medium transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            onClick={goToToday}
          >
            Today
          </button>
          <div className="flex overflow-hidden rounded border border-white/20 text-sm">
            <button
              type="button"
              className="px-3 py-1.5 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              onClick={goToPrevious}
              aria-label="Go to previous range"
            >
              ‹
            </button>
            <button
              type="button"
              className="border-l border-white/20 px-3 py-1.5 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              onClick={goToNext}
              aria-label="Go to next range"
            >
              ›
            </button>
          </div>
          <div className="flex overflow-hidden rounded border border-white/20 text-sm">
            {viewOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`px-3 py-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                  view === option.id
                    ? 'bg-blue-500/40 text-white'
                    : 'text-white/80 hover:bg-white/10'
                }`}
                onClick={() => handleViewChange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            {view === 'month' && (
              <MonthView
                focusDate={focusDate}
                selectedDate={focusDate}
                events={events}
                onSelectDate={handleSelectDate}
                onSelectEvent={handleSelectEvent}
              />
            )}
            {view === 'week' && (
              <WeekView
                focusDate={focusDate}
                selectedDate={focusDate}
                events={events}
                onSelectDate={handleSelectDate}
                onSelectEvent={handleSelectEvent}
              />
            )}
            {view === 'day' && (
              <DayView
                focusDate={focusDate}
                events={events}
                onSelectEvent={handleSelectEvent}
              />
            )}
            <div className="md:hidden">
              <EventDetail
                event={selectedEvent}
                focusDate={focusDate}
                onClear={() => setSelectedEvent(null)}
              />
            </div>
            <KeyboardShortcuts />
          </div>
        </div>
        <aside className="hidden w-80 shrink-0 border-l border-white/10 bg-black/40 p-4 md:block">
          <EventDetail
            event={selectedEvent}
            focusDate={focusDate}
            onClear={() => setSelectedEvent(null)}
          />
        </aside>
      </div>
      <div className="sr-only" aria-live="polite">
        Focused on {formatDateFull(focusDate)} in {view} view.
      </div>
    </div>
  );
}
