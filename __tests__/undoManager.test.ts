import { UndoManager, UndoConflictError } from '../src/undo';
import type { UndoConflict } from '../src/undo';
import type { Logger } from '../lib/logger';

const createLoggerMock = (): Logger => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
});

describe('UndoManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('marks entries as successful after undo completes', async () => {
    const manager = new UndoManager(createLoggerMock());
    const undo = jest.fn();

    manager.record({ id: '1', label: 'Create file', undo });

    const result = await manager.undo();

    expect(result.success).toBe(true);
    expect(undo).toHaveBeenCalledTimes(1);

    const [entry] = manager.getEntries();
    expect(entry.status).toBe('success');
    expect(entry.error).toBeUndefined();
  });

  it('marks entries as failed when undo throws and keeps stack usable', async () => {
    const logger = createLoggerMock();
    const manager = new UndoManager(logger);
    const firstUndo = jest.fn();

    manager.record({ id: 'first', label: 'First change', undo: firstUndo });
    manager.record({
      id: 'second',
      label: 'Second change',
      undo: () => {
        throw new Error('boom');
      },
    });

    const firstResult = await manager.undo();
    expect(firstResult.success).toBe(false);

    const entriesAfterFailure = manager.getEntries();
    expect(entriesAfterFailure[1].status).toBe('error');
    expect(entriesAfterFailure[1].error).toBe('boom');
    expect(logger.error).toHaveBeenCalledWith('Undo failed', expect.objectContaining({ entryId: 'second' }));

    const secondResult = await manager.undo();
    expect(secondResult.success).toBe(true);
    expect(firstUndo).toHaveBeenCalledTimes(1);

    const entriesAfterSuccess = manager.getEntries();
    expect(entriesAfterSuccess[0].status).toBe('success');
    expect(entriesAfterSuccess[0].error).toBeUndefined();
  });

  it('returns conflict details when undo throws UndoConflictError', async () => {
    const logger = createLoggerMock();
    const manager = new UndoManager(logger);

    const conflict: UndoConflict = {
      entryId: 'conflict',
      entryLabel: 'Rename project',
      message: 'Blocked by newer changes',
      blockingEntries: [{ id: 'existing', label: 'Existing rename' }],
    };

    manager.record({
      id: conflict.entryId,
      label: conflict.entryLabel,
      undo: () => {
        throw new UndoConflictError('conflict detected', conflict);
      },
    });

    const result = await manager.undo();

    expect(result.success).toBe(false);
    expect(result.conflict).toEqual(conflict);
    expect(logger.warn).toHaveBeenCalledWith('Undo conflict encountered', expect.objectContaining({ entryId: conflict.entryId }));

    const [entry] = manager.getEntries();
    expect(entry.status).toBe('error');
    expect(entry.error).toBe('conflict detected');
  });

  it('returns false when there is nothing to undo', async () => {
    const manager = new UndoManager(createLoggerMock());
    const result = await manager.undo();
    expect(result.success).toBe(false);
  });
});
