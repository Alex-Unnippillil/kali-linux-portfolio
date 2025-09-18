import { Desktop } from '../components/screen/desktop';
import { cleanupAppRuntime } from '../utils/appRuntime';

jest.mock('../utils/appRuntime', () => ({
  cleanupAppRuntime: jest.fn(),
  ensureHeapBaseline: jest.fn(),
}));

describe('Desktop forceQuitApp', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('cleans runtime state and restarts when requested', async () => {
    jest.useFakeTimers();
    const desktop = new Desktop({});
    desktop.state.closed_windows = { 'test-app': false };
    desktop.closeApp = jest.fn(() => Promise.resolve());
    desktop.openApp = jest.fn();

    const listener = jest.fn();
    window.addEventListener('force-quit', listener);

    await desktop.forceQuitApp('test-app', { restart: true });

    expect(cleanupAppRuntime).toHaveBeenCalledWith('test-app');
    expect(desktop.closeApp).toHaveBeenCalledWith('test-app', { skipSnapshot: true });
    expect(listener).toHaveBeenCalled();

    jest.runAllTimers();
    expect(desktop.openApp).toHaveBeenCalledWith('test-app');

    window.removeEventListener('force-quit', listener);
    jest.useRealTimers();
  });
});
