type StorageMethods = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'clear' | 'key'>;

jest.mock('../utils/safeStorage', () => {
  const storage: jest.Mocked<StorageMethods> & { length: number } = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    key: jest.fn(),
    length: 0,
  };
  return { safeLocalStorage: storage };
});

import { Desktop } from '../components/screen/desktop';
import { safeLocalStorage } from '../utils/safeStorage';

const getStorage = () =>
  safeLocalStorage as jest.Mocked<StorageMethods> & { length: number };

const createDesktop = () => {
  const desktop = new Desktop({ snapEnabled: true });
  (desktop as unknown as { props: { snapEnabled: boolean } }).props = { snapEnabled: true };
  desktop.setState = (updater: any, callback?: () => void) => {
    const partial =
      typeof updater === 'function' ? updater(desktop.state, desktop.props) : updater;
    if (partial && typeof partial === 'object') {
      desktop.state = { ...desktop.state, ...partial };
    }
    if (typeof callback === 'function') {
      callback();
    }
  };
  return desktop;
};

describe('Desktop window layout persistence', () => {
  beforeEach(() => {
    const storage = getStorage();
    storage.getItem.mockReset();
    storage.setItem.mockReset();
    storage.removeItem.mockReset();
    storage.clear.mockReset();
    storage.key.mockReset();
  });

  it('persists geometry for multiple apps', () => {
    const storage = getStorage();
    const desktop = createDesktop();

    desktop.handleWindowLayoutChange('app-one', {
      x: 12,
      y: 34,
      width: 50,
      height: 60,
      snapped: 'left',
      maximized: false,
    });

    desktop.handleWindowLayoutChange('app-two', {
      x: 100,
      y: 200,
      width: 80,
      height: 90,
      snapped: null,
      maximized: true,
    });

    expect(storage.setItem).toHaveBeenCalled();
    const [, payload] = storage.setItem.mock.calls[storage.setItem.mock.calls.length - 1];
    expect(JSON.parse(payload)).toEqual({
      'app-one': {
        x: 16,
        y: 32,
        width: 50,
        height: 60,
        state: { snapped: 'left', maximized: false },
      },
      'app-two': {
        x: 104,
        y: 200,
        width: 80,
        height: 90,
        state: { snapped: null, maximized: true },
      },
    });

    expect(desktop.state.window_positions['app-one']).toMatchObject({
      x: 16,
      y: 32,
      width: 50,
      height: 60,
      state: { snapped: 'left', maximized: false },
    });
    expect(desktop.state.window_positions['app-two']).toMatchObject({
      x: 104,
      y: 200,
      width: 80,
      height: 90,
      state: { snapped: null, maximized: true },
    });
  });

  it('hydrates stored layout from safeLocalStorage', () => {
    const storage = getStorage();
    storage.getItem.mockReturnValue(
      JSON.stringify({
        'app-one': {
          x: 5,
          y: 6,
          width: 70,
          height: 80,
          state: { snapped: 'right', minimized: true },
        },
        'app-two': {
          x: 15,
          y: 25,
          width: 55,
          height: 65,
          state: { maximized: true },
        },
      }),
    );

    const desktop = createDesktop();
    desktop.state.minimized_windows = { 'app-one': false, 'app-two': false };

    const parsed = desktop.readStoredLayout();
    expect(parsed).toEqual({
      'app-one': {
        x: 5,
        y: 6,
        width: 70,
        height: 80,
        state: { snapped: 'right', minimized: true },
      },
      'app-two': {
        x: 15,
        y: 25,
        width: 55,
        height: 65,
        state: { maximized: true },
      },
    });

    desktop.applyStoredLayout(parsed);

    expect(desktop.state.window_positions['app-one']).toMatchObject({
      x: 5,
      y: 6,
      width: 70,
      height: 80,
      state: { snapped: 'right', minimized: true },
    });
    expect(desktop.state.minimized_windows['app-one']).toBe(true);
    expect(desktop.state.window_positions['app-two']).toMatchObject({
      x: 15,
      y: 25,
      width: 55,
      height: 65,
      state: { maximized: true },
    });
  });
});
