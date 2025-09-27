import type { CalendarCategory, CalendarEvent, CalendarView } from './types';

export const WEEK_START = 1; // Monday

export function startOfDay(date: Date): Date {
  const next = new Date(date.getTime());
  next.setHours(0, 0, 0, 0);
  return next;
}

export function endOfDay(date: Date): Date {
  const next = startOfDay(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
}

export function addWeeks(date: Date, amount: number): Date {
  return addDays(date, amount * 7);
}

export function addMonths(date: Date, amount: number): Date {
  const next = new Date(date.getTime());
  const dayOfMonth = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + amount);
  const monthLength = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(dayOfMonth, monthLength));
  return startOfDay(next);
}

export function startOfWeek(date: Date, weekStartsOn: number = WEEK_START): Date {
  const normalized = startOfDay(date);
  const diff = (normalized.getDay() - weekStartsOn + 7) % 7;
  return addDays(normalized, -diff);
}

export function endOfWeek(date: Date, weekStartsOn: number = WEEK_START): Date {
  return addDays(startOfWeek(date, weekStartsOn), 6);
}

export function startOfMonth(date: Date): Date {
  const next = startOfDay(date);
  next.setDate(1);
  return next;
}

export function endOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function isEventOnDay(event: CalendarEvent, day: Date): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  return event.start <= dayEnd && event.end >= dayStart;
}

export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  const diff = a.start.getTime() - b.start.getTime();
  if (diff !== 0) return diff;
  return a.end.getTime() - b.end.getTime();
}

export function moveByView(date: Date, view: CalendarView, amount: number): Date {
  switch (view) {
    case 'month':
      return addMonths(date, amount);
    case 'week':
      return addWeeks(date, amount);
    case 'day':
    default:
      return addDays(date, amount);
  }
}

export function startOfView(date: Date, view: CalendarView): Date {
  switch (view) {
    case 'month':
      return startOfMonth(date);
    case 'week':
      return startOfWeek(date);
    case 'day':
    default:
      return startOfDay(date);
  }
}

export function endOfView(date: Date, view: CalendarView): Date {
  switch (view) {
    case 'month':
      return endOfMonth(date);
    case 'week':
      return endOfWeek(date);
    case 'day':
    default:
      return endOfDay(date);
  }
}

const monthTitleFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  year: 'numeric',
});

const weekStartFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const weekEndFormatterDifferentMonth = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

const weekEndFormatterSameMonth = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
});

const yearFormatter = new Intl.DateTimeFormat(undefined, { year: 'numeric' });

const dayFullFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const dayHeaderFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const weekdayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

export function formatWeekRange(date: Date): string {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = weekStartFormatter.format(start);
  const endLabel = (sameMonth ? weekEndFormatterSameMonth : weekEndFormatterDifferentMonth).format(end);
  if (sameYear) {
    return `${startLabel} – ${endLabel}, ${yearFormatter.format(end)}`;
  }
  return `${startLabel}, ${yearFormatter.format(start)} – ${endLabel}, ${yearFormatter.format(end)}`;
}

export function formatViewLabel(date: Date, view: CalendarView): string {
  switch (view) {
    case 'month':
      return monthTitleFormatter.format(date);
    case 'week':
      return formatWeekRange(date);
    case 'day':
    default:
      return dayFullFormatter.format(date);
  }
}

export function formatDayHeader(date: Date): string {
  return dayHeaderFormatter.format(date);
}

export function formatWeekday(date: Date): string {
  return weekdayFormatter.format(date);
}

export function formatDateFull(date: Date): string {
  return dayFullFormatter.format(date);
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function setTime(date: Date, hours: number, minutes = 0): Date {
  const next = startOfDay(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function getEventsForDate(
  date: Date,
  events: CalendarEvent[],
): CalendarEvent[] {
  return events
    .filter((event) => isEventOnDay(event, date))
    .map((event) => ({ ...event }))
    .sort(compareEvents);
}

const categoryBackground: Record<CalendarCategory | 'default', string> = {
  operations: 'border-blue-400/60 bg-blue-500/20',
  research: 'border-purple-400/60 bg-purple-500/20',
  community: 'border-emerald-400/60 bg-emerald-500/20',
  training: 'border-amber-400/60 bg-amber-500/20',
  maintenance: 'border-slate-400/60 bg-slate-500/20',
  personal: 'border-pink-400/60 bg-pink-500/20',
  default: 'border-white/20 bg-white/10',
};

const categoryBadge: Record<CalendarCategory | 'default', string> = {
  operations: 'bg-blue-500/30 text-blue-100',
  research: 'bg-purple-500/30 text-purple-100',
  community: 'bg-emerald-500/30 text-emerald-100',
  training: 'bg-amber-500/30 text-amber-100',
  maintenance: 'bg-slate-500/30 text-slate-100',
  personal: 'bg-pink-500/30 text-pink-100',
  default: 'bg-white/20 text-white',
};

export function getCategoryClass(category?: CalendarCategory): string {
  return categoryBackground[category ?? 'default'];
}

export function getCategoryBadgeClass(category?: CalendarCategory): string {
  return categoryBadge[category ?? 'default'];
}

export function formatCategoryLabel(category?: CalendarCategory): string {
  if (!category) return 'General';
  return category.charAt(0).toUpperCase() + category.slice(1);
}
