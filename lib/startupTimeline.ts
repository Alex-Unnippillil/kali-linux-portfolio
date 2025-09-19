export interface StartupTimelineMark {
  phase: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface StartupTimelineEntry extends StartupTimelineMark {
  sinceStart: number;
  sincePrevious: number;
}

export type StartupTimelineWindowPayload = {
  marks: StartupTimelineMark[];
  entries: StartupTimelineEntry[];
  markPhase: (phase: string, metadata?: Record<string, unknown>) => StartupTimelineMark;
  getTimeline: () => StartupTimelineEntry[];
  toCsv: (entries?: StartupTimelineEntry[]) => string;
};

const marks: StartupTimelineMark[] = [];

const getNow = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const computeEntries = (): StartupTimelineEntry[] => {
  if (marks.length === 0) {
    return [];
  }
  const start = marks[0].timestamp;
  let previous = start;

  return marks.map((mark, index) => {
    const sinceStart = index === 0 ? 0 : mark.timestamp - start;
    const sincePrevious = index === 0 ? 0 : mark.timestamp - previous;
    previous = mark.timestamp;
    return {
      phase: mark.phase,
      timestamp: mark.timestamp,
      metadata: mark.metadata,
      sinceStart,
      sincePrevious,
    };
  });
};

const syncWindow = (entries?: StartupTimelineEntry[]): void => {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') {
    return;
  }
  const payloadEntries = entries ?? computeEntries();
  const win = window as Window & { __STARTUP_TIMELINE__?: StartupTimelineWindowPayload };
  win.__STARTUP_TIMELINE__ = {
    marks: marks.slice(),
    entries: payloadEntries,
    markPhase,
    getTimeline,
    toCsv,
  };
};

export const markPhase = (phase: string, metadata?: Record<string, unknown>): StartupTimelineMark => {
  const entry: StartupTimelineMark = {
    phase,
    timestamp: getNow(),
    metadata,
  };
  marks.push(entry);
  syncWindow();
  return entry;
};

export const getTimeline = (): StartupTimelineEntry[] => {
  const entries = computeEntries();
  syncWindow(entries);
  return entries;
};

const escapeCsv = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const toCsv = (entries: StartupTimelineEntry[] = getTimeline()): string => {
  const header = ['phase', 'timestamp_ms', 'since_start_ms', 'since_previous_ms', 'metadata'];
  const rows = entries.map((entry) => {
    const base = [
      escapeCsv(entry.phase),
      entry.timestamp.toFixed(2),
      entry.sinceStart.toFixed(2),
      entry.sincePrevious.toFixed(2),
    ];
    const metadataValue = entry.metadata ? escapeCsv(JSON.stringify(entry.metadata)) : '';
    return [...base, metadataValue].join(',');
  });
  return [header.join(','), ...rows].join('\n');
};

export const __unsafeClearTimeline = (): void => {
  marks.splice(0, marks.length);
  syncWindow();
};
