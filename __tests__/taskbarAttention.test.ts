import {
  hydrateAttentionState,
  taskbarAttentionReducer,
} from '../modules/taskbarAttention';

describe('taskbarAttentionReducer', () => {
  it('syncs ids while preserving existing counts and pulse state', () => {
    const initial = hydrateAttentionState(['alpha']);
    const withBadge = taskbarAttentionReducer(initial, {
      type: 'update',
      id: 'alpha',
      detail: { badgeCount: 2, pulse: true },
    });

    const synced = taskbarAttentionReducer(withBadge, {
      type: 'sync',
      ids: ['alpha', 'beta'],
    });

    expect(synced.alpha).toEqual({ badgeCount: 2, pulse: true });
    expect(synced.beta).toEqual({ badgeCount: 0, pulse: false });
  });

  it('supports delta updates and clear operations', () => {
    const state = hydrateAttentionState(['notifier']);
    const incremented = taskbarAttentionReducer(state, {
      type: 'update',
      id: 'notifier',
      detail: { delta: 3 },
    });
    expect(incremented.notifier).toEqual({ badgeCount: 3, pulse: false });

    const withPulse = taskbarAttentionReducer(incremented, {
      type: 'update',
      id: 'notifier',
      detail: { pulse: true },
    });
    expect(withPulse.notifier).toEqual({ badgeCount: 3, pulse: true });

    const cleared = taskbarAttentionReducer(withPulse, {
      type: 'update',
      id: 'notifier',
      detail: { clear: true },
    });
    expect(cleared.notifier).toEqual({ badgeCount: 0, pulse: false });
  });

  it('clamps badge counts between 0 and 99', () => {
    const state = hydrateAttentionState(['alerts']);
    const setHigh = taskbarAttentionReducer(state, {
      type: 'update',
      id: 'alerts',
      detail: { badgeCount: 150.8 },
    });
    expect(setHigh.alerts.badgeCount).toBe(99);

    const decremented = taskbarAttentionReducer(setHigh, {
      type: 'update',
      id: 'alerts',
      detail: { delta: -200 },
    });
    expect(decremented.alerts.badgeCount).toBe(0);
  });
});
