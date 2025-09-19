import { Desktop } from '../components/screen/desktop';

describe('Desktop window cycling', () => {
  test('skips minimized windows when cycling forward', () => {
    const desktop = new Desktop();
    desktop.app_stack = ['terminal', 'terminal#1', 'terminal#2'];
    desktop.state = {
      ...desktop.state,
      focused_windows: {
        terminal: false,
        'terminal#1': true,
        'terminal#2': false,
      },
      minimized_windows: {
        terminal: false,
        'terminal#1': false,
        'terminal#2': true,
      },
      closed_windows: {
        terminal: false,
        'terminal#1': false,
        'terminal#2': false,
      },
    };

    const focusSpy = jest.spyOn(desktop, 'focus').mockImplementation(() => {});
    desktop.cycleAppWindows(1);
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledWith('terminal');
    focusSpy.mockRestore();
  });

  test('wraps around when cycling backward', () => {
    const desktop = new Desktop();
    desktop.app_stack = ['terminal', 'terminal#1', 'terminal#2'];
    desktop.state = {
      ...desktop.state,
      focused_windows: {
        terminal: true,
        'terminal#1': false,
        'terminal#2': false,
      },
      minimized_windows: {
        terminal: false,
        'terminal#1': false,
        'terminal#2': false,
      },
      closed_windows: {
        terminal: false,
        'terminal#1': false,
        'terminal#2': false,
      },
    };

    const focusSpy = jest.spyOn(desktop, 'focus').mockImplementation(() => {});
    desktop.cycleAppWindows(-1);
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledWith('terminal#2');
    focusSpy.mockRestore();
  });

  test('includes grouped tabs when cycling', () => {
    const desktop = new Desktop();
    desktop.app_stack = ['terminal'];
    desktop.grouped_tabs = {
      terminal: ['terminal#tab1', 'terminal#tab2'],
    };
    desktop.state = {
      ...desktop.state,
      focused_windows: {
        terminal: false,
        'terminal#tab1': true,
        'terminal#tab2': false,
      },
      minimized_windows: {
        terminal: false,
        'terminal#tab1': false,
        'terminal#tab2': false,
      },
      closed_windows: {
        terminal: false,
        'terminal#tab1': false,
        'terminal#tab2': false,
      },
    };

    const focusSpy = jest.spyOn(desktop, 'focus').mockImplementation(() => {});
    desktop.cycleAppWindows(1);
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(focusSpy).toHaveBeenCalledWith('terminal#tab2');
    focusSpy.mockRestore();
  });
});

