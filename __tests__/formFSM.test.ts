import {
  createInitialFormState,
  guardedTransition,
} from '../utils/fsm/formFSM';

describe('formFSM transition map', () => {
  it('moves from idle to dirty on change', () => {
    const idle = createInitialFormState();
    const dirty = guardedTransition(idle, { type: 'CHANGE' });
    expect(dirty.status).toBe('Dirty');
    expect(dirty.touched).toBe(true);
    expect(dirty.canSubmit).toBe(false);
  });

  it('validates, submits and resolves with payload', () => {
    let state = createInitialFormState();
    state = guardedTransition(state, { type: 'CHANGE' });
    state = guardedTransition(state, { type: 'VALID' });
    expect(state.status).toBe('Valid');
    expect(state.canSubmit).toBe(true);

    const running = guardedTransition(state, {
      type: 'SUBMIT',
      payload: { foo: 'bar' },
    });
    expect(running.status).toBe('Running');
    expect(running.effect).toBe('submit');
    expect(running.payload).toEqual({ foo: 'bar' });

    const done = guardedTransition(running, {
      type: 'RESOLVE',
      result: { ok: true },
    });
    expect(done.status).toBe('Done');
    expect(done.effect).toBe('success');
    expect(done.result).toEqual({ ok: true });
    expect(done.canSubmit).toBe(true);
  });

  it('returns to dirty with an error on rejection', () => {
    let state = createInitialFormState();
    state = guardedTransition(state, { type: 'CHANGE' });
    state = guardedTransition(state, { type: 'VALID' });
    state = guardedTransition(state, { type: 'SUBMIT' });
    const failed = guardedTransition(state, {
      type: 'REJECT',
      error: 'Boom',
    });
    expect(failed.status).toBe('Dirty');
    expect(failed.error).toBe('Boom');
    expect(failed.effect).toBe('error');
  });

  it('blocks submit until the form is valid', () => {
    let state = createInitialFormState();
    state = guardedTransition(state, { type: 'CHANGE' });
    const attempted = guardedTransition(state, { type: 'SUBMIT' });
    expect(attempted).toBe(state);
  });
});
