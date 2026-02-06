'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Dispatch, FormEvent, KeyboardEvent, SetStateAction } from 'react';

interface CalendarEvent {
  id: string;
  date: string; // ISO date string in the format yyyy-MM-dd
  title: string;
  time: string;
  color: string;
}

interface EventDraft {
  title: string;
  time: string;
  color: string;
}

type EventButtonRegistry = Map<string, HTMLButtonElement>;

const weekdayLabels = (() => {
  const start = startOfWeek(new Date(), { weekStartsOn: 0 });
  return Array.from({ length: 7 }, (_, index) =>
    format(addDays(start, index), 'EEE'),
  );
})();

const isoFormatter = (date: Date) => format(date, 'yyyy-MM-dd');

const focusAfterFrame = (cb: () => void) => {
  if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
    window.requestAnimationFrame(() => cb());
  } else {
    cb();
  }
};

export default function CalendarApp() {
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const base = startOfMonth(new Date());
    return [
      {
        id: 'event-1',
        date: isoFormatter(addDays(base, 2)),
        title: 'Red Team Sync',
        time: '09:00 – 10:00',
        color: '#2563eb',
      },
      {
        id: 'event-2',
        date: isoFormatter(addDays(base, 5)),
        title: 'Incident Review',
        time: '13:00 – 14:00',
        color: '#22d3ee',
      },
      {
        id: 'event-3',
        date: isoFormatter(addDays(base, 8)),
        title: 'App Launch Prep',
        time: '11:00 – 12:30',
        color: '#6366f1',
      },
      {
        id: 'event-4',
        date: isoFormatter(addDays(base, 12)),
        title: 'Threat Briefing',
        time: '16:00 – 17:00',
        color: '#f97316',
      },
      {
        id: 'event-5',
        date: isoFormatter(addDays(base, 18)),
        title: 'Patch Window',
        time: 'All day',
        color: '#14b8a6',
      },
    ];
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const eventButtonRefs = useRef<EventButtonRegistry>(new Map());

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const registerEventButton = useCallback((id: string, node: HTMLButtonElement | null) => {
    const map = eventButtonRefs.current;
    if (node) {
      map.set(id, node);
    } else {
      map.delete(id);
    }
  }, []);

  const focusEventButton = useCallback((id: string) => {
    const node = eventButtonRefs.current.get(id);
    node?.focus();
  }, []);

  const openEditor = useCallback((event: CalendarEvent) => {
    setEditingId(event.id);
    setDraft({
      title: event.title,
      time: event.time,
      color: event.color,
    });
  }, []);

  const closeEditor = useCallback(
    (id: string) => {
      setEditingId(null);
      setDraft(null);
      focusAfterFrame(() => focusEventButton(id));
    },
    [focusEventButton],
  );

  const handleSubmit = useCallback(
    (id: string, values: EventDraft) => {
      setEvents((prev) =>
        prev.map((evt) =>
          evt.id === id
            ? {
                ...evt,
                title: values.title.trim(),
                time: values.time.trim(),
                color: values.color,
              }
            : evt,
        ),
      );
      closeEditor(id);
    },
    [closeEditor],
  );

  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth((month) => startOfMonth(addMonths(month, -1)));
    setEditingId(null);
    setDraft(null);
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth((month) => startOfMonth(addMonths(month, 1)));
    setEditingId(null);
    setDraft(null);
  }, []);

  return (
    <main className="flex h-full flex-col bg-gradient-to-b from-zinc-900/70 via-black to-black p-4 text-zinc-100">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-zinc-300">
            Select an event to open an inline editor with title, time, and color settings.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded border border-zinc-700/60 px-3 py-1 font-medium transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Previous
          </button>
          <span
            aria-live="polite"
            className="min-w-[140px] text-center text-base font-semibold"
          >
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded border border-zinc-700/60 px-3 py-1 font-medium transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Next
          </button>
        </div>
      </header>
      <div className="grid grid-cols-7 gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {weekdayLabels.map((label) => (
          <div key={label} className="rounded-md bg-zinc-800/60 p-2 text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="mt-2 grid flex-1 grid-cols-7 gap-2 overflow-y-auto rounded-lg bg-zinc-900/40 p-2">
        {monthDays.map((day) => {
          const isoDate = isoFormatter(day);
          const dayEvents = events.filter((evt) => evt.date === isoDate);
          const isCurrent = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          const labelId = `calendar-day-${isoDate}`;

          return (
            <section
              key={isoDate}
              aria-labelledby={labelId}
              className={`flex min-h-[120px] flex-col rounded-md border border-transparent bg-zinc-800/50 p-2 ${
                isCurrent ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <header className="flex items-center justify-between">
                <p
                  id={labelId}
                  className={`flex items-center gap-2 text-sm font-semibold ${
                    isToday ? 'text-sky-400' : 'text-zinc-200'
                  }`}
                >
                  <span className="text-lg" aria-hidden="true">
                    {format(day, 'd')}
                  </span>
                  <span className="sr-only">
                    {format(day, 'EEEE, MMMM d, yyyy')}
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs font-medium text-sky-300">
                      Today
                    </span>
                  )}
                </p>
              </header>
              <div className="mt-2 flex flex-col gap-2">
                {dayEvents.map((event) => (
                  <CalendarEventItem
                    key={event.id}
                    event={event}
                    isEditing={editingId === event.id}
                    draft={draft}
                    setDraft={setDraft}
                    onStartEdit={() => openEditor(event)}
                    onCancel={() => closeEditor(event.id)}
                    onSubmit={(values) => handleSubmit(event.id, values)}
                    registerButton={registerEventButton}
                  />
                ))}
                {dayEvents.length === 0 && (
                  <p className="text-xs text-zinc-500">No events</p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

interface CalendarEventItemProps {
  event: CalendarEvent;
  isEditing: boolean;
  draft: EventDraft | null;
  setDraft: Dispatch<SetStateAction<EventDraft | null>>;
  onStartEdit: () => void;
  onCancel: () => void;
  onSubmit: (values: EventDraft) => void;
  registerButton: (id: string, node: HTMLButtonElement | null) => void;
}

function CalendarEventItem({
  event,
  isEditing,
  draft,
  setDraft,
  onStartEdit,
  onCancel,
  onSubmit,
  registerButton,
}: CalendarEventItemProps) {
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  const updateDraft = useCallback(
    (field: keyof EventDraft, value: string) => {
      setDraft((prev) => {
        if (!prev || !isEditing) {
          return prev;
        }
        return {
          ...prev,
          [field]: value,
        };
      });
    },
    [isEditing, setDraft],
  );

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!draft) {
        return;
      }
      const trimmedTitle = draft.title.trim();
      const trimmedTime = draft.time.trim();
      if (!trimmedTitle || !trimmedTime || !draft.color) {
        return;
      }
      onSubmit({
        title: trimmedTitle,
        time: trimmedTime,
        color: draft.color,
      });
    },
    [draft, onSubmit],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLFormElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    },
    [onCancel],
  );

  if (isEditing && draft) {
    return (
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        aria-label={`Edit ${event.title}`}
        className="rounded-md border border-sky-500/60 bg-black/80 p-3 text-xs text-zinc-100 shadow focus-within:ring-2 focus-within:ring-sky-500"
      >
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-zinc-400">Title</span>
            <input
              ref={titleInputRef}
              type="text"
              value={draft.title}
              onChange={(event) => updateDraft('title', event.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-50 shadow-inner focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-zinc-400">Time</span>
            <input
              type="text"
              value={draft.time}
              onChange={(event) => updateDraft('time', event.target.value)}
              placeholder="e.g. 09:00 – 10:00"
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-50 shadow-inner focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-wide text-zinc-400">Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={draft.color}
                onChange={(event) => updateDraft('color', event.target.value)}
                className="h-9 w-9 cursor-pointer rounded border border-zinc-600 bg-transparent p-0"
                aria-label="Event color"
                required
              />
              <input
                type="text"
                value={draft.color}
                onChange={(event) => updateDraft('color', event.target.value)}
                className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-50 shadow-inner focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                aria-label="Hex color value"
                pattern="^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$"
                title="Enter a valid hex color, for example #1f2937"
                required
              />
            </div>
          </label>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-transparent px-3 py-1 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-sky-500 px-3 py-1 text-xs font-semibold text-black transition hover:bg-sky-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            Save
          </button>
        </div>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={onStartEdit}
      className="group flex w-full flex-col gap-1 rounded-md border border-zinc-700/30 bg-zinc-800/80 px-2 py-2 text-left text-xs text-zinc-100 transition hover:border-zinc-500/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
      style={{
        borderLeftColor: event.color,
        borderLeftWidth: '4px',
      }}
      aria-label={`${event.title} at ${event.time}. Press enter to edit.`}
      aria-expanded={isEditing}
      ref={(node) => registerButton(event.id, node)}
    >
      <span className="flex items-center gap-2 font-medium">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: event.color }}
        />
        <span className="truncate">{event.title}</span>
      </span>
      <span className="text-[11px] text-zinc-300">{event.time}</span>
    </button>
  );
}

