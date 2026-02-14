import type { UndoConflict } from './types';

export class UndoConflictError extends Error {
  constructor(message: string, public readonly conflict: UndoConflict) {
    super(message);
    this.name = 'UndoConflictError';
  }
}
