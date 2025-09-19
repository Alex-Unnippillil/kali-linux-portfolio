import {
  ACTION_TYPES,
  clearJournal,
  deserializeActionEntry,
  getActions,
  recordAction,
  recordSettingsChange,
  replayActions,
  resetJournalState,
  revertActions,
  serializeActionEntry,
  setActiveProfile,
} from '../utils/actionJournal';

describe('actionJournal', () => {
  beforeEach(async () => {
    resetJournalState();
    await clearJournal();
  });

  it('serializes and deserializes entries', () => {
    const entry = {
      type: ACTION_TYPES.desktop.open,
      payload: { appId: 'about' },
      timestamp: 12345,
    } as const;
    const serialized = serializeActionEntry(entry);
    expect(typeof serialized).toBe('string');
    const deserialized = deserializeActionEntry(serialized);
    expect(deserialized).toEqual(entry);
  });

  it('stores records per profile', async () => {
    await recordAction(
      { type: ACTION_TYPES.desktop.open, payload: { appId: 'about' }, timestamp: 1 },
      { profileId: 'alpha' },
    );
    setActiveProfile('beta');
    await recordAction({ type: ACTION_TYPES.desktop.close, payload: { appId: 'about' }, timestamp: 2 });

    const alpha = await getActions('alpha');
    const beta = await getActions('beta');

    expect(alpha).toHaveLength(1);
    expect(alpha[0].entry.type).toBe(ACTION_TYPES.desktop.open);
    expect(alpha[0].profileId).toBe('alpha');

    expect(beta).toHaveLength(1);
    expect(beta[0].entry.type).toBe(ACTION_TYPES.desktop.close);
    expect(beta[0].profileId).toBe('beta');
  });

  it('replays records in timestamp order', async () => {
    await recordAction({ type: ACTION_TYPES.desktop.open, payload: { appId: 'second' }, timestamp: 200 });
    await recordAction({ type: ACTION_TYPES.desktop.open, payload: { appId: 'first' }, timestamp: 50 });

    const order: string[] = [];
    await replayActions((record) => {
      order.push(record.entry.payload.appId);
    });

    expect(order).toEqual(['first', 'second']);
  });

  it('reverts the most recent actions', async () => {
    await recordAction({ type: ACTION_TYPES.desktop.open, payload: { appId: 'one' }, timestamp: 1 });
    await recordAction({ type: ACTION_TYPES.desktop.open, payload: { appId: 'two' }, timestamp: 2 });

    const reverted: string[] = [];
    const removed = await revertActions((record) => {
      reverted.push(record.entry.payload.appId);
    }, { count: 1 });

    expect(removed).toBe(1);
    expect(reverted).toEqual(['two']);

    const remaining = await getActions('default');
    expect(remaining.map((r) => r.entry.payload.appId)).toEqual(['one']);
  });

  it('deduplicates identical settings changes', async () => {
    await recordSettingsChange('accent', '#123456');
    await recordSettingsChange('accent', '#123456');
    await recordSettingsChange('accent', '#abcdef');

    const actions = await getActions('default');
    expect(actions).toHaveLength(2);
    expect(actions[0].entry.payload).toEqual({ key: 'accent', value: '#123456' });
    expect(actions[1].entry.payload).toEqual({ key: 'accent', value: '#abcdef' });
  });
});
