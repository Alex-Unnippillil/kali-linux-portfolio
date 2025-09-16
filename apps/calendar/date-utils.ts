export const DAYS_IN_WEEK = 7;

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function startOfWeek(date: Date, weekStartsOn = 0): Date {
  const result = startOfDay(date);
  const day = result.getDay();
  const diff = (day - weekStartsOn + DAYS_IN_WEEK) % DAYS_IN_WEEK;
  result.setDate(result.getDate() - diff);
  return result;
}

export function endOfWeek(date: Date, weekStartsOn = 0): Date {
  const result = startOfWeek(date, weekStartsOn);
  result.setDate(result.getDate() + (DAYS_IN_WEEK - 1));
  return result;
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

export function addWeeks(date: Date, amount: number): Date {
  return addDays(date, amount * DAYS_IN_WEEK);
}

export function addMonths(date: Date, amount: number): Date {
  const result = new Date(date);
  const dayOfMonth = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + amount);
  const monthLength = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();
  result.setDate(Math.min(dayOfMonth, monthLength));
  return startOfDay(result);
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

export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [yearStr, monthStr, dayStr] = key.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if ([year, month, day].some((value) => Number.isNaN(value))) {
    return startOfDay(new Date(key));
  }
  return startOfDay(new Date(year, month - 1, day));
}

export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-US',
): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

export function compareDates(a: Date, b: Date): number {
  return startOfDay(a).getTime() - startOfDay(b).getTime();
}

export function getMonthMatrix(
  reference: Date,
  weekStartsOn = 0,
): Date[][] {
  const firstDay = startOfWeek(startOfMonth(reference), weekStartsOn);
  const lastDay = endOfWeek(endOfMonth(reference), weekStartsOn);
  const matrix: Date[][] = [];
  let current = firstDay;
  while (current <= lastDay) {
    const week: Date[] = [];
    for (let i = 0; i < DAYS_IN_WEEK; i += 1) {
      week.push(current);
      current = addDays(current, 1);
    }
    matrix.push(week);
  }
  return matrix;
}

export function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

export function isAfter(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() > startOfDay(b).getTime();
}

export function daysBetween(start: Date, end: Date): number {
  const startDay = startOfDay(start).getTime();
  const endDay = startOfDay(end).getTime();
  const diff = endDay - startDay;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

