export type DesktopHistoryAction = "open" | "close";

export interface DesktopHistoryEntry {
  id: string;
  appId: string;
  title: string;
  action: DesktopHistoryAction;
  timestamp: number;
  workspace: number;
}

export interface DesktopHistoryGroup {
  label: string;
  entries: DesktopHistoryEntry[];
}

export const MAX_HISTORY_ENTRIES = 50;

export function isDesktopHistoryEntry(value: unknown): value is DesktopHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<DesktopHistoryEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.appId === "string" &&
    typeof entry.title === "string" &&
    (entry.action === "open" || entry.action === "close") &&
    typeof entry.timestamp === "number" &&
    Number.isFinite(entry.timestamp) &&
    typeof entry.workspace === "number"
  );
}

export function insertHistoryEntry(
  entries: DesktopHistoryEntry[] | undefined,
  next: DesktopHistoryEntry,
  max: number = MAX_HISTORY_ENTRIES,
): DesktopHistoryEntry[] {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const merged = [next, ...safeEntries];
  if (merged.length <= max) {
    return merged;
  }
  return merged.slice(0, max);
}

const FIVE_MINUTES = 5 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

function isSameDay(a: number, b: number) {
  const dateA = new Date(a);
  const dateB = new Date(b);
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export function formatHistoryTimestamp(timestamp: number): string {
  return timeFormatter.format(new Date(timestamp));
}

export function groupHistoryEntries(
  entries: DesktopHistoryEntry[] | undefined,
  now: number = Date.now(),
): DesktopHistoryGroup[] {
  if (!entries || entries.length === 0) {
    return [];
  }

  const buckets = new Map<string, DesktopHistoryEntry[]>();
  const order: string[] = [];

  const register = (label: string, entry: DesktopHistoryEntry) => {
    if (!buckets.has(label)) {
      buckets.set(label, []);
      order.push(label);
    }
    buckets.get(label)!.push(entry);
  };

  entries.forEach((entry) => {
    const diff = now - entry.timestamp;
    if (diff < FIVE_MINUTES) {
      register("Last 5 minutes", entry);
    } else if (diff < ONE_HOUR) {
      register("Last hour", entry);
    } else if (isSameDay(entry.timestamp, now)) {
      register("Earlier today", entry);
    } else {
      register(dateFormatter.format(new Date(entry.timestamp)), entry);
    }
  });

  return order.map((label) => ({ label, entries: buckets.get(label)! }));
}
