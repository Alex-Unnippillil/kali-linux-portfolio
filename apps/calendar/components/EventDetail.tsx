'use client';

import type { CalendarEvent } from '../types';
import {
  formatCategoryLabel,
  formatDateFull,
  formatTime,
  formatTimeRange,
  getCategoryBadgeClass,
  isSameDay,
} from '../utils';

interface EventDetailProps {
  event: CalendarEvent | null;
  focusDate: Date;
  onClear: () => void;
}

export default function EventDetail({
  event,
  focusDate,
  onClear,
}: EventDetailProps) {
  if (!event) {
    return (
      <section className="rounded border border-white/10 bg-black/30 p-4 text-sm text-white/70">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
          Event details
        </h2>
        <p className="mt-2 leading-relaxed">
          Select any event to view its description. The current day in focus is
          <span className="font-semibold text-white">
            {' '}
            {formatDateFull(focusDate)}
          </span>
          .
        </p>
      </section>
    );
  }

  const sameDay = isSameDay(event.start, event.end);
  const dateLabel = sameDay
    ? formatDateFull(event.start)
    : `${formatDateFull(event.start)} – ${formatDateFull(event.end)}`;
  const timeLabel = sameDay
    ? formatTimeRange(event.start, event.end)
    : `${formatTime(event.start)} – ${formatTime(event.end)}`;

  return (
    <section className="space-y-3 rounded border border-white/10 bg-black/30 p-4 text-white">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
          Event details
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium uppercase tracking-wide text-white/70 underline-offset-2 hover:text-white hover:underline"
        >
          Clear
        </button>
      </div>
      <div
        className={`inline-flex items-center gap-2 rounded px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ${getCategoryBadgeClass(
          event.category,
        )}`}
      >
        {formatCategoryLabel(event.category)}
      </div>
      <div className="text-lg font-semibold leading-snug">{event.title}</div>
      <div className="text-sm text-white/80">
        {dateLabel}
        <span className="mx-1">·</span>
        {timeLabel}
      </div>
      {event.location && (
        <div className="text-sm text-white/70">📍 {event.location}</div>
      )}
      {event.description && (
        <p className="text-sm leading-relaxed text-white/80">
          {event.description}
        </p>
      )}
    </section>
  );
}
