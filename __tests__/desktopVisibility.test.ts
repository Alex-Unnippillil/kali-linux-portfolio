describe('Desktop window visibility tracking', () => {
  let desktop: any;

  beforeEach(() => {
    const { Desktop } = require('../components/screen/desktop');
    desktop = new Desktop();
    desktop.props = desktop.props || {};
    desktop.setState = jest.fn(function setState(this: any, updater: any, callback?: () => void) {
      const next = typeof updater === 'function' ? updater(this.state, this.props) : updater;
      if (next && typeof next === 'object') {
        this.state = { ...this.state, ...next };
      }
      if (typeof callback === 'function') {
        callback();
      }
    });
    desktop.state.window_visibility = {};
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('records visibility transitions and emits events', () => {
    const handler = jest.fn();
    window.addEventListener('desktop-window-visibility', handler);

    desktop.state.window_visibility['demo-app'] = false;
    desktop.setWindowVisibility('demo-app', true);

    expect(desktop.state.window_visibility['demo-app']).toBe(true);
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ detail: { id: 'demo-app', visible: true } }),
    );

    desktop.setWindowVisibility('demo-app', false);
    expect(desktop.state.window_visibility['demo-app']).toBe(false);
    expect(handler).toHaveBeenLastCalledWith(
      expect.objectContaining({ detail: { id: 'demo-app', visible: false } }),
    );

    window.removeEventListener('desktop-window-visibility', handler);
  });

  it('avoids redundant updates when state is unchanged', () => {
    const handler = jest.fn();
    window.addEventListener('desktop-window-visibility', handler);

    desktop.state.window_visibility['demo-app'] = true;
    desktop.setWindowVisibility('demo-app', true);

    expect(handler).not.toHaveBeenCalled();

    window.removeEventListener('desktop-window-visibility', handler);
  });
});
