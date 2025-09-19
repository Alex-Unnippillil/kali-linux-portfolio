import { renderHook, act, waitFor, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import FirstRunTour from '../components/onboarding/FirstRunTour';
import useFirstRunTour, { FIRST_RUN_TOUR_STORAGE_KEY } from '../hooks/useFirstRunTour';
import { SettingsProvider } from '../hooks/useSettings';
import { safeLocalStorage } from '../utils/safeStorage';

jest.mock('../hooks/useSettings', () => {
  const React = require('react');
  let reducedMotion = false;
  const setMockReducedMotion = (value: boolean) => {
    reducedMotion = value;
  };
  const useSettings = () => ({ reducedMotion });
  const SettingsProvider = ({ children }: { children: ReactNode }) =>
    React.createElement(React.Fragment, null, children);
  return {
    __esModule: true,
    useSettings,
    SettingsProvider,
    setMockReducedMotion,
  };
});

jest.mock('../utils/safeStorage', () => {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
  };
  return {
    safeLocalStorage: storage,
  };
});

const { setMockReducedMotion } = jest.requireMock('../hooks/useSettings') as {
  setMockReducedMotion: (value: boolean) => void;
};

const getMockStorage = () => {
  if (!safeLocalStorage) {
    throw new Error('safeLocalStorage mock not initialised');
  }
  return safeLocalStorage;
};

const installMockLocalStorage = () => {
  const storage = getMockStorage();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get: () => storage,
  });
  return storage;
};

describe('useFirstRunTour', () => {
  beforeEach(() => {
    setMockReducedMotion(false);
    installMockLocalStorage().clear();
  });

  it('persists completion state', async () => {
    const { result } = renderHook(() => useFirstRunTour(), {
      wrapper: SettingsProvider,
    });

    expect(result.current.shouldShow).toBe(true);

    act(() => {
      result.current.complete();
    });

    await waitFor(() =>
      expect(getMockStorage().getItem(FIRST_RUN_TOUR_STORAGE_KEY)).toBe('completed'),
    );
    expect(result.current.shouldShow).toBe(false);
  });

  it('honors reduced motion preference', async () => {
    setMockReducedMotion(true);

    const { result } = renderHook(() => useFirstRunTour(), {
      wrapper: SettingsProvider,
    });

    expect(result.current.shouldShow).toBe(false);
    expect(result.current.status).toBe('pending');
  });
});

describe('FirstRunTour overlay', () => {
  beforeEach(() => {
    setMockReducedMotion(false);
    installMockLocalStorage().clear();
  });

  it('does not steal focus when it appears', async () => {
    function Wrapper({ ready }: { ready: boolean }) {
      return (
        <SettingsProvider>
          <div>
            <button data-testid="focus-anchor">Open apps</button>
            <FirstRunTour desktopReady={ready} />
          </div>
        </SettingsProvider>
      );
    }

    const { rerender } = render(<Wrapper ready={false} />);

    const anchor = screen.getByTestId('focus-anchor');
    act(() => {
      anchor.focus();
    });
    expect(document.activeElement).toBe(anchor);

    rerender(<Wrapper ready />);

    await screen.findByTestId('first-run-tour');
    expect(document.activeElement).toBe(anchor);
    expect(screen.getByRole('button', { name: /skip tour/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /done/i })).toBeInTheDocument();
  });
});
