import { Desktop } from '../components/screen/desktop';
import { WINDOW_SWITCHER_CYCLE_EVENT } from '../components/screen/window-switcher';

describe('Desktop Alt+Tab shortcuts', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the window switcher in reverse order with Shift+Alt+Tab', () => {
    const desktop = new Desktop();
    const preventDefault = jest.fn();
    const openSpy = jest
      .spyOn(desktop, 'openWindowSwitcher')
      .mockImplementation(() => {});

    desktop.state.showWindowSwitcher = false;

    desktop.handleGlobalShortcut({
      key: 'Tab',
      altKey: true,
      shiftKey: true,
      preventDefault,
    } as KeyboardEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledWith(-1);
  });

  it('cycles backwards when Shift+Alt+Tab is pressed while open', () => {
    const desktop = new Desktop();
    const preventDefault = jest.fn();
    desktop.state.showWindowSwitcher = true;
    desktop.state.switcherWindows = [
      { id: 'one', title: 'One', icon: '', minimized: false, isFocused: false },
    ] as any;

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    desktop.handleGlobalShortcut({
      key: 'Tab',
      altKey: true,
      shiftKey: true,
      preventDefault,
    } as KeyboardEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(dispatchSpy).toHaveBeenCalled();
    const eventArg = dispatchSpy.mock.calls[0][0] as CustomEvent;
    expect(eventArg.type).toBe(WINDOW_SWITCHER_CYCLE_EVENT);
    expect(eventArg.detail).toEqual({ direction: -1 });
  });
});
