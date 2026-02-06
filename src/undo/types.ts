export type JournalStatus = 'pending' | 'success' | 'error';

export interface JournalEntry {
  id: string;
  label: string;
  undo: () => Promise<void> | void;
  timestamp: number;
  status: JournalStatus;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface UndoConflict {
  entryId: string;
  entryLabel: string;
  message: string;
  blockingEntries: Array<Pick<JournalEntry, 'id' | 'label'>>;
}
