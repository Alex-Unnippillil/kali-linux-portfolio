import { useMemo } from 'react';
import {
  addDays,
  dateKey,
  formatDate,
  startOfDay,
  startOfWeek,
} from '../date-utils';
import { CalendarEvent } from '../types';

interface WeekAgendaProps {
  referenceDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

export default function WeekAgenda({
  referenceDate,
  eventsByDate,
  selectedDate,
  onSelectDate,
}: WeekAgendaProps) {
  const weekStart = useMemo(() => startOfWeek(referenceDate), [referenceDate]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  return (
    <div className="mt-4 grid gap-4 text-white md:grid-cols-7">
      {days.map((day) => {
        const key = dateKey(day);
        const events = (eventsByDate[key] ?? []).slice().sort((a, b) => a.start.getTime() - b.start.getTime());
        const formattedDate = formatDate(day, { month: 'short', day: 'numeric' }, locale);
        const isSelected = startOfDay(day).getTime() === startOfDay(selectedDate).getTime();
        return (
          <section
            key={key}
            className={`rounded border border-slate-700 bg-slate-900 p-3 ${
              isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' : ''
            }`}
          >
            <button
              type="button"
              onClick={() => onSelectDate(startOfDay(day))}
              className="flex w-full flex-col items-start gap-1 focus:outline-none focus:ring"
            >
              <span className="text-xs uppercase tracking-wide text-slate-300">
                {formatDate(day, { weekday: 'short' }, locale)}
              </span>
              <span className="text-lg font-semibold">{formattedDate}</span>
            </button>
            <ul className="mt-3 space-y-2 text-sm">
              {events.length === 0 && (
                <li className="text-slate-400">No events</li>
              )}
              {events.map((event) => (
                <li key={event.id} className="rounded bg-slate-700/60 p-2">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-xs text-slate-300">
                    {formatDate(event.start, { hour: 'numeric', minute: '2-digit' }, locale)} –
                    {` ${formatDate(event.end, { hour: 'numeric', minute: '2-digit' }, locale)}`}
                  </div>
                  {event.location && (
                    <div className="text-xs text-slate-400">{event.location}</div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
