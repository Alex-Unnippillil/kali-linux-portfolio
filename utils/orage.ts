export interface OrageEvent {
  date?: string;
  start?: string;
  title?: string;
  summary?: string;
  description?: string;
  [key: string]: unknown;
}

/**
 * Lists events from the Orage integration for the given year and month.
 * Falls back to an empty list when the integration is unavailable.
 */
export async function listEvents(year: number, month: number): Promise<OrageEvent[]> {
  try {
    const api = (window as any)?.orage;
    if (api && typeof api.listEvents === 'function') {
      return await api.listEvents(year, month);
    }
  } catch {
    // ignore and return empty array
  }
  return [];
}

export default { listEvents };
