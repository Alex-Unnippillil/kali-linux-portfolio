import { randomBytes } from 'crypto';

export interface WaitlistEntry {
  email: string;
  token: string;
  confirmed: boolean;
  timestamp: number;
}

// simple in-memory KV store using a Map; survives for life of process
const globalAny: any = globalThis as any;
export const kv: Map<string, WaitlistEntry> =
  globalAny.__WAITLIST_KV__ || (globalAny.__WAITLIST_KV__ = new Map());

export function enqueue(email: string): WaitlistEntry {
  const token = randomBytes(16).toString('hex');
  const entry: WaitlistEntry = {
    email,
    token,
    confirmed: false,
    timestamp: Date.now(),
  };
  kv.set(email, entry);
  return entry;
}

export function confirm(token: string): boolean {
  for (const entry of kv.values()) {
    if (entry.token === token) {
      entry.confirmed = true;
      return true;
    }
  }
  return false;
}

export function exportCsv(): string {
  let csv = 'email,timestamp\n';
  for (const entry of kv.values()) {
    if (entry.confirmed) {
      csv += `${entry.email},${new Date(entry.timestamp).toISOString()}\n`;
    }
  }
  return csv;
}
