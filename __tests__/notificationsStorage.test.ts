import {
  DEFAULT_RETENTION_MS,
  createPersistedState,
  migratePersistedNotifications,
  pruneExpiredNotifications,
} from '../utils/notifications/storage';

describe('notification storage helpers', () => {
  const now = Date.now();

  it('prunes notifications that exceed the retention window', () => {
    const withinWindow = now - DEFAULT_RETENTION_MS + 1000;
    const stale = now - DEFAULT_RETENTION_MS - 1000;

    const state = {
      terminal: [
        {
          id: '1',
          appId: 'terminal',
          title: 'Recent',
          timestamp: withinWindow,
          read: false,
          priority: 'normal',
          classification: {
            priority: 'normal',
            matchedRuleId: null,
            source: 'default',
          },
        },
        {
          id: '2',
          appId: 'terminal',
          title: 'Old',
          timestamp: stale,
          read: true,
          priority: 'low',
          classification: {
            priority: 'low',
            matchedRuleId: null,
            source: 'default',
          },
        },
      ],
    };

    const pruned = pruneExpiredNotifications(state, now);

    expect(pruned).toEqual({
      terminal: [state.terminal[0]],
    });
  });

  it('migrates legacy persisted payloads', () => {
    const legacy = {
      terminal: [
        {
          id: '1',
          appId: 'terminal',
          title: 'Legacy',
          timestamp: now,
          read: false,
          priority: 'high',
          classification: {
            priority: 'high',
            matchedRuleId: null,
            source: 'default',
          },
        },
        { invalid: true },
      ],
      invalid: 'nope',
    } as unknown;

    const migrated = migratePersistedNotifications(legacy);

    expect(migrated).toEqual({
      terminal: [
        {
          id: '1',
          appId: 'terminal',
          title: 'Legacy',
          timestamp: now,
          read: false,
          priority: 'high',
          classification: {
            priority: 'high',
            matchedRuleId: null,
            source: 'default',
          },
        },
      ],
    });
  });

  it('wraps persisted data with version metadata', () => {
    const state = {
      terminal: [
        {
          id: '1',
          appId: 'terminal',
          title: 'Persisted',
          timestamp: now,
          read: false,
          priority: 'high',
          classification: {
            priority: 'high',
            matchedRuleId: null,
            source: 'default',
          },
        },
      ],
    };

    const persisted = createPersistedState(state, now);

    expect(persisted).toEqual({
      version: 1,
      timestamp: now,
      data: state,
    });
  });
});

