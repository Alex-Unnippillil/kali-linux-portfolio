import { FetchEntry } from '../../lib/fetchProxy';

export interface HistoryEntry extends FetchEntry {
  recordedAt: number;
}

export const isHistoryEntryArray = (value: unknown): value is HistoryEntry[] =>
  Array.isArray(value) &&
  value.every((item) =>
    item !== null &&
    typeof item === 'object' &&
    typeof (item as Partial<HistoryEntry>).recordedAt === 'number',
  );
