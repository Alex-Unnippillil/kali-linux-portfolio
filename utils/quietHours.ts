export function isWithinQuietHours(
  now: Date,
  start: string,
  end: string
): boolean {
  if (!start || !end) return false;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  const startDate = new Date(now);
  startDate.setHours(sH, sM, 0, 0);
  const endDate = new Date(now);
  endDate.setHours(eH, eM, 0, 0);
  if (start === end) return false;
  if (startDate < endDate) {
    return now >= startDate && now < endDate;
  }
  return now >= startDate || now < endDate;
}
