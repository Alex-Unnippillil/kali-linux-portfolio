import { useMemo } from 'react';
import {
  compareDates,
  dateKey,
  formatDate,
  startOfDay,
} from '../date-utils';
import { CalendarEvent } from '../types';

interface AgendaListProps {
  events: CalendarEvent[];
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
}

const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

export default function AgendaList({
  events,
  onSelectDate,
  selectedDate,
}: AgendaListProps) {
  const grouped = useMemo(() => {
    const sorted = events
      .slice()
      .sort((a, b) => compareDates(a.start, b.start) || a.start.getTime() - b.start.getTime());
    const map = new Map<string, { date: Date; items: CalendarEvent[] }>();
    sorted.forEach((event) => {
      const key = dateKey(event.start);
      if (!map.has(key)) {
        map.set(key, { date: startOfDay(event.start), items: [event] });
      } else {
        map.get(key)?.items.push(event);
      }
    });
    return Array.from(map.values());
  }, [events]);

  if (grouped.length === 0) {
    return <p className="mt-6 text-slate-300">No upcoming events scheduled.</p>;
  }

  return (
    <div className="mt-4 space-y-6 text-white">
      {grouped.map((group) => {
        const isSelected = startOfDay(group.date).getTime() === startOfDay(selectedDate).getTime();
        return (
          <section key={dateKey(group.date)}>
            <button
              type="button"
              onClick={() => onSelectDate(group.date)}
              className={`flex items-baseline gap-3 text-left focus:outline-none focus:ring ${
                isSelected ? 'text-blue-400' : 'text-slate-200'
              }`}
            >
              <span className="text-lg font-semibold">
                {formatDate(group.date, { month: 'long', day: 'numeric' }, locale)}
              </span>
              <span className="text-sm uppercase tracking-wide text-slate-400">
                {formatDate(group.date, { weekday: 'short' }, locale)}
              </span>
            </button>
            <ul className="mt-2 space-y-2">
              {group.items.map((event) => (
                <li key={event.id} className="rounded border border-slate-700 bg-slate-900 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-xs text-slate-300">
                      {formatDate(event.start, { hour: 'numeric', minute: '2-digit' }, locale)} –
                      {` ${formatDate(event.end, { hour: 'numeric', minute: '2-digit' }, locale)}`}
                    </div>
                  </div>
                  {event.location && (
                    <div className="mt-1 text-xs text-slate-400">{event.location}</div>
                  )}
                  {event.description && (
                    <p className="mt-2 text-sm text-slate-300">{event.description}</p>
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
