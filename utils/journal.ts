export type UndoHandler = () => void | Promise<void>;

export interface JournalEntry {
  appId?: string | null;
  undo: UndoHandler;
  redo?: UndoHandler;
  description?: string;
  /**
   * Optional metadata bag for app specific details. Consumers should treat this
   * as read only data attached to the entry when it was recorded.
   */
  metadata?: Record<string, unknown>;
}

export type JournalEvent =
  | { type: 'record'; entry: JournalEntry }
  | { type: 'clear'; appId?: string | null }
  | { type: 'reset' };

type Listener = (event: JournalEvent) => void;

const listeners = new Set<Listener>();

const emit = (event: JournalEvent) => {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      // Listeners should be resilient. Swallow errors so one faulty listener
      // does not break the journal fan out.
      if (process.env.NODE_ENV !== 'production') {
        console.error('journal listener failed', error);
      }
    }
  });
};

export const recordJournalEntry = (entry: JournalEntry): void => {
  // Clone the entry so downstream consumers do not accidentally mutate the
  // reference provided by the caller.
  emit({
    type: 'record',
    entry: {
      appId: entry.appId ?? null,
      undo: entry.undo,
      redo: entry.redo,
      description: entry.description,
      metadata: entry.metadata,
    },
  });
};

export const clearJournal = (appId?: string | null): void => {
  emit({ type: 'clear', appId });
};

export const resetJournal = (): void => {
  emit({ type: 'reset' });
};

export const subscribeToJournal = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const journal = {
  record: recordJournalEntry,
  clear: clearJournal,
  reset: resetJournal,
  subscribe: subscribeToJournal,
};

export default journal;
