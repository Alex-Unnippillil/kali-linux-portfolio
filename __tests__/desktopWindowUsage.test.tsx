import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn(() => Promise.resolve('data:image/png;base64,')) }));

describe('Desktop window usage order', () => {
  function createDesktop() {
    const desktop = new Desktop({});
    desktop.setState = function setState(updater, callback) {
      const update =
        typeof updater === 'function' ? updater(this.state, this.props) : updater;
      if (update && typeof update === 'object') {
        this.state = { ...this.state, ...update };
      }
      if (typeof callback === 'function') {
        callback();
      }
    };
    return desktop;
  }

  it('promotes focused window to the front of the usage order', () => {
    const desktop = createDesktop();
    desktop.app_stack = ['window-one', 'window-two', 'window-three'];
    desktop.state = {
      ...desktop.state,
      focused_windows: {
        'window-one': true,
        'window-two': false,
        'window-three': false,
      },
      windowUsage: [...desktop.app_stack],
    };

    desktop.focus('window-two');

    expect(desktop.state.windowUsage).toEqual([
      'window-two',
      'window-one',
      'window-three',
    ]);
    expect(desktop.state.focused_windows).toEqual({
      'window-one': false,
      'window-two': true,
      'window-three': false,
    });
  });

  it('builds window switcher state using the tracked order', () => {
    const desktop = createDesktop();
    desktop.app_stack = ['alpha', 'beta', 'gamma'];
    desktop.state = {
      ...desktop.state,
      closed_windows: { alpha: false, beta: false, gamma: false },
      focused_windows: { alpha: true, beta: false, gamma: false },
      windowUsage: ['alpha', 'beta', 'gamma'],
    };

    desktop.openWindowSwitcher();

    expect(desktop.state.showWindowSwitcher).toBe(true);
    expect(desktop.state.switcherWindows.map((win) => win.id)).toEqual([
      'alpha',
      'beta',
      'gamma',
    ]);
    expect(desktop.state.switcherIndex).toBe(1);
  });

  it('selects a window and hides the switcher overlay', () => {
    const desktop = createDesktop();
    const openApp = jest.fn();
    desktop.openApp = openApp;
    desktop.state = {
      ...desktop.state,
      showWindowSwitcher: true,
      switcherWindows: [{ id: 'alpha', title: 'Alpha', icon: null }],
      switcherIndex: 0,
    };

    desktop.selectWindow('alpha');

    expect(openApp).toHaveBeenCalledWith('alpha');
    expect(desktop.state.showWindowSwitcher).toBe(false);
    expect(desktop.state.switcherWindows).toEqual([]);
    expect(desktop.state.switcherIndex).toBe(0);
  });
});
