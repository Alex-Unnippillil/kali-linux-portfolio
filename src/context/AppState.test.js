const { appReducer, buildInitialState } = require('./AppState');

describe('AppState reducer', () => {
  test('opens and closes window', () => {
    const id = 'sample';
    let state = buildInitialState();
    state.windows[id] = { isOpen: false, isFocused: false, isMinimized: false };
    state = appReducer(state, { type: 'OPEN_WINDOW', id });
    expect(state.windows[id].isOpen).toBe(true);
    state = appReducer(state, { type: 'CLOSE_WINDOW', id });
    expect(state.windows[id].isOpen).toBe(false);
  });
});

