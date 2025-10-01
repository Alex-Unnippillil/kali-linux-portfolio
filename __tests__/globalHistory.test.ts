import {
  createScopedHistory,
  resetHistory,
  setActiveScope,
  addExcludedScope,
} from '../utils/history/globalHistory';

describe('globalHistory', () => {
  beforeEach(() => {
    resetHistory();
  });

  test('undo and redo follow stack order', () => {
    const history = createScopedHistory('demo');
    const sequence: string[] = [];
    history.register({
      undo: () => {
        sequence.push('undo1');
        return true;
      },
      redo: () => {
        sequence.push('redo1');
        return true;
      },
    });
    history.register({
      undo: () => {
        sequence.push('undo2');
        return true;
      },
      redo: () => {
        sequence.push('redo2');
        return true;
      },
    });
    setActiveScope('demo');
    expect(history.undo()).toBe(true);
    expect(history.undo()).toBe(true);
    expect(sequence).toEqual(['undo2', 'undo1']);
    expect(history.redo()).toBe(true);
    expect(history.redo()).toBe(true);
    expect(sequence).toEqual(['undo2', 'undo1', 'redo1', 'redo2']);
  });

  test('excluded scopes do not record actions', () => {
    addExcludedScope('skip');
    const history = createScopedHistory('skip');
    let called = false;
    history.register({
      undo: () => {
        called = true;
        return true;
      },
      redo: () => {
        called = true;
        return true;
      },
    });
    setActiveScope('skip');
    expect(history.undo()).toBe(false);
    expect(history.redo()).toBe(false);
    expect(called).toBe(false);
  });

  test('redo restores undone changes', () => {
    const history = createScopedHistory('values');
    let value = 0;
    const apply = () => {
      value += 1;
    };
    apply();
    history.register({
      undo: () => {
        value -= 1;
        return true;
      },
      redo: () => {
        value += 1;
        return true;
      },
    });
    setActiveScope('values');
    expect(history.undo()).toBe(true);
    expect(value).toBe(0);
    expect(history.redo()).toBe(true);
    expect(value).toBe(1);
  });
});
