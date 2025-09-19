import { undoManager } from '../hooks/useUndoManager';
import {
  clearJournal,
  recordJournalEntry,
  resetJournal,
} from '../utils/journal';

describe('undoManager', () => {
  beforeEach(() => {
    resetJournal();
  });

  it('tracks per-app stacks alongside the global history', () => {
    const first = jest.fn();
    const second = jest.fn();

    recordJournalEntry({ appId: 'app-a', undo: first });
    recordJournalEntry({ appId: 'app-b', undo: second });

    let snapshot = undoManager.getSnapshot();
    expect(snapshot.global).toHaveLength(2);
    expect(snapshot.apps['app-a']).toHaveLength(1);
    expect(snapshot.apps['app-b']).toHaveLength(1);

    expect(undoManager.undoApp('app-a')).toBe(true);
    expect(first).toHaveBeenCalledTimes(1);

    snapshot = undoManager.getSnapshot();
    expect(snapshot.global).toHaveLength(1);
    expect(snapshot.apps['app-a']).toBeUndefined();
    expect(snapshot.apps['app-b']).toHaveLength(1);

    expect(undoManager.undoGlobal()).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(undoManager.getSnapshot().global).toHaveLength(0);
  });

  it('clears stacks by app id and through reset events', () => {
    const noop = jest.fn();
    recordJournalEntry({ appId: 'app-a', undo: noop });
    recordJournalEntry({ appId: 'app-b', undo: noop });

    clearJournal('app-a');
    let snapshot = undoManager.getSnapshot();
    expect(snapshot.apps['app-a']).toBeUndefined();
    expect(snapshot.global.every((entry) => entry.appId !== 'app-a')).toBe(true);

    resetJournal();
    snapshot = undoManager.getSnapshot();
    expect(snapshot.global).toHaveLength(0);
    expect(Object.keys(snapshot.apps)).toHaveLength(0);
  });

  it('handles desktop-scoped entries without an app id', () => {
    const undoDesktop = jest.fn();
    recordJournalEntry({ undo: undoDesktop });

    expect(undoManager.undoGlobal()).toBe(true);
    expect(undoDesktop).toHaveBeenCalledTimes(1);
    expect(undoManager.getSnapshot().global).toHaveLength(0);
  });
});
