import React from 'react';
import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';

import Ubuntu from '../../components/ubuntu';

/**
 * These tests mount the Ubuntu shell with a jsdom-safe Storage mock.
 * The mock lives in the module factory so local state persists across
 * remounts, and Jest fake timers keep the boot animation timeout
 * from slowing down assertions.
 */

type MockStorage = Storage & {
  getItem: jest.Mock<string | null, [string]>;
  setItem: jest.Mock<void, [string, string | boolean]>;
  removeItem: jest.Mock<void, [string]>;
  clear: jest.Mock<void, []>;
  key: jest.Mock<string | null, [number]>;
};

type StorageControl = {
  storageState: Map<string, string>;
  mock: MockStorage;
};

function createMockStorage(): StorageControl {
  const storageState = new Map<string, string>();

  const mock = {
    getItem: jest.fn((key: string) =>
      storageState.has(key) ? storageState.get(key)! : null,
    ),
    setItem: jest.fn((key: string, value: string | boolean) => {
      storageState.set(key, String(value));
    }),
    removeItem: jest.fn((key: string) => {
      storageState.delete(key);
    }),
    clear: jest.fn(() => {
      storageState.clear();
    }),
    key: jest.fn((index: number) => Array.from(storageState.keys())[index] ?? null),
    get length() {
      return storageState.size;
    },
  } as unknown as MockStorage;

  return { storageState, mock };
}

jest.mock('../../utils/safeStorage', () => {
  const control = createMockStorage();
  (globalThis as typeof globalThis & {
    __ubuntuStorageControl?: StorageControl;
  }).__ubuntuStorageControl = control;
  return {
    safeLocalStorage: control.mock,
  };
});

const getStorageControl = () =>
  (globalThis as typeof globalThis & {
    __ubuntuStorageControl?: StorageControl;
  }).__ubuntuStorageControl!;

let storageState: Map<string, string>;
let safeLocalStorageMock: MockStorage;

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

jest.mock(
  '../../components/desktop/Layout',
  () =>
    function LayoutMock({ children }: { children: ReactNode }) {
      return <div data-testid="layout-mock">{children}</div>;
    },
);

jest.mock(
  '../../components/screen/desktop',
  () =>
    function DesktopMock() {
      return <div data-testid="desktop-mock" />;
    },
);

jest.mock(
  '../../components/screen/lock_screen',
  () =>
    function LockScreenMock() {
      return <div data-testid="lock-screen-mock" />;
    },
);

jest.mock(
  '../../components/screen/navbar',
  () =>
    function NavbarMock() {
      return <div data-testid="navbar-mock" />;
    },
);

jest.mock(
  '../../components/screen/booting_screen',
  () =>
    function BootingScreenMock() {
      return <div data-testid="booting-screen-mock" />;
    },
);

describe('Ubuntu persistence via safeLocalStorage', () => {
  beforeEach(() => {
    const control = getStorageControl();
    storageState = control.storageState;
    safeLocalStorageMock = control.mock;
    jest.useFakeTimers();
    storageState.clear();
    safeLocalStorageMock.getItem.mockClear();
    safeLocalStorageMock.setItem.mockClear();
    safeLocalStorageMock.removeItem.mockClear();
    safeLocalStorageMock.clear.mockClear();
    safeLocalStorageMock.key.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('persists the lock screen state and restores it on remount', () => {
    let instance: Ubuntu | null = null;
    const { unmount } = render(<Ubuntu ref={(value) => (instance = value)} />);
    expect(instance).not.toBeNull();

    act(() => {
      instance!.lockScreen();
    });

    expect(safeLocalStorageMock.setItem).toHaveBeenCalledWith('screen-locked', true);
    expect(storageState.get('screen-locked')).toBe('true');
    expect(instance!.state.screen_locked).toBe(true);

    unmount();

    let restored: Ubuntu | null = null;
    render(<Ubuntu ref={(value) => (restored = value)} />);

    expect(restored).not.toBeNull();
    expect(restored!.state.screen_locked).toBe(true);
    expect(safeLocalStorageMock.getItem).toHaveBeenCalledWith('screen-locked');
  });

  it('persists shutdown state and restores it on remount', () => {
    let instance: Ubuntu | null = null;
    const { unmount } = render(<Ubuntu ref={(value) => (instance = value)} />);
    expect(instance).not.toBeNull();

    act(() => {
      instance!.shutDown();
    });

    expect(safeLocalStorageMock.setItem).toHaveBeenCalledWith('shut-down', true);
    expect(storageState.get('shut-down')).toBe('true');
    expect(instance!.state.shutDownScreen).toBe(true);

    unmount();

    let restored: Ubuntu | null = null;
    render(<Ubuntu ref={(value) => (restored = value)} />);

    expect(restored).not.toBeNull();
    expect(restored!.state.shutDownScreen).toBe(true);
    expect(safeLocalStorageMock.getItem).toHaveBeenCalledWith('shut-down');
  });

  it('persists the background image selection', () => {
    let instance: Ubuntu | null = null;
    const { unmount } = render(<Ubuntu ref={(value) => (instance = value)} />);
    expect(instance).not.toBeNull();

    act(() => {
      instance!.changeBackgroundImage('wall-7');
    });

    expect(safeLocalStorageMock.setItem).toHaveBeenCalledWith('bg-image', 'wall-7');
    expect(storageState.get('bg-image')).toBe('wall-7');
    expect(instance!.state.bg_image_name).toBe('wall-7');

    unmount();

    let restored: Ubuntu | null = null;
    render(<Ubuntu ref={(value) => (restored = value)} />);

    expect(restored).not.toBeNull();
    expect(restored!.state.bg_image_name).toBe('wall-7');
    expect(safeLocalStorageMock.getItem).toHaveBeenCalledWith('bg-image');
  });
});
