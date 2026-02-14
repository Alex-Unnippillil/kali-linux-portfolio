import { createLogger, type Logger } from '../../lib/logger';
import { UndoConflictError } from './errors';
import type { JournalEntry, UndoConflict } from './types';

export interface RecordEntryInput {
  id: string;
  label: string;
  undo: () => Promise<void> | void;
  timestamp?: number;
  meta?: Record<string, unknown>;
}

export interface UndoResult {
  success: boolean;
  entry?: JournalEntry;
  conflict?: UndoConflict;
}

export class UndoManager {
  private readonly journal: JournalEntry[] = [];
  private readonly logger: Logger;

  constructor(logger: Logger = createLogger()) {
    this.logger = logger;
  }

  record(input: RecordEntryInput): JournalEntry {
    const entry: JournalEntry = {
      id: input.id,
      label: input.label,
      undo: input.undo,
      timestamp: input.timestamp ?? Date.now(),
      status: 'pending',
      meta: input.meta,
    };

    this.journal.push(entry);
    this.logger.debug('Undo entry recorded', {
      entryId: entry.id,
      label: entry.label,
    });

    return { ...entry };
  }

  getEntries(): JournalEntry[] {
    return this.journal.map(entry => ({ ...entry }));
  }

  async undo(): Promise<UndoResult> {
    const entry = this.findLastPending();
    if (!entry) {
      this.logger.debug('No undo entries available');
      return { success: false };
    }

    try {
      await Promise.resolve(entry.undo());
      entry.status = 'success';
      delete entry.error;

      this.logger.info('Undo completed', {
        entryId: entry.id,
        label: entry.label,
      });

      return { success: true, entry: { ...entry } };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      entry.status = 'error';
      entry.error = message;

      if (error instanceof UndoConflictError) {
        this.logger.warn('Undo conflict encountered', {
          entryId: entry.id,
          label: entry.label,
          conflict: error.conflict,
        });

        return {
          success: false,
          entry: { ...entry },
          conflict: error.conflict,
        };
      }

      this.logger.error('Undo failed', {
        entryId: entry.id,
        label: entry.label,
        error: message,
      });

      return { success: false, entry: { ...entry } };
    }
  }

  private findLastPending(): JournalEntry | undefined {
    for (let i = this.journal.length - 1; i >= 0; i -= 1) {
      const entry = this.journal[i];
      if (entry.status === 'pending') {
        return entry;
      }
    }
    return undefined;
  }
}
