import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';
import {
  useFeatureFlags,
  defaultFeatureFlags,
  __resetFeatureFlagStoreForTests,
} from '../hooks/useFeatureFlags';

const nativeFetch = global.fetch;
const originalLocalStorage = window.localStorage;
const originalSessionStorage = window.sessionStorage;

const createStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
};

describe('feature flag overrides', () => {
  beforeEach(() => {
    __resetFeatureFlagStoreForTests();
    const local = createStorage();
    const session = createStorage();
    Object.defineProperty(window, 'localStorage', {
      value: local,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: session,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (nativeFetch) {
      global.fetch = nativeFetch;
    } else {
      // @ts-ignore
      delete global.fetch;
    }
    if (originalLocalStorage) {
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
        writable: true,
      });
    } else {
      // @ts-ignore
      delete window.localStorage;
    }
    if (originalSessionStorage) {
      Object.defineProperty(window, 'sessionStorage', {
        value: originalSessionStorage,
        configurable: true,
        writable: true,
      });
    } else {
      // @ts-ignore
      delete window.sessionStorage;
    }
    jest.restoreAllMocks();
  });

  test('applies overrides and notifies subscribers on refresh', async () => {
    const mockFetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          toolApis: true,
          hydra: true,
          labsUnlocked: true,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          toolApis: false,
          hydra: true,
        }),
      });

    global.fetch = mockFetch as unknown as typeof fetch;

    const { result } = renderHook(
      () => {
        const settings = useSettings();
        const featureFlags = useFeatureFlags();
        return { settings, featureFlags };
      },
      { wrapper: SettingsProvider }
    );

    expect(result.current.featureFlags.flags).toEqual(
      expect.objectContaining(defaultFeatureFlags)
    );

    await act(async () => {
      result.current.settings.setAllowNetwork(true);
    });

    await act(async () => {
      await result.current.featureFlags.setOverrideUrl('/mock/flags.json');
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.current.featureFlags.status).toBe('ready');
    expect(result.current.featureFlags.flags.toolApis).toBe(true);
    expect(result.current.featureFlags.flags.hydra).toBe(true);
    expect(result.current.featureFlags.flags.labsUnlocked).toBe(true);

    act(() => {
      result.current.featureFlags.setFlag('toolApis', false);
    });
    expect(result.current.featureFlags.flags.toolApis).toBe(false);

    act(() => {
      result.current.featureFlags.resetFlag('toolApis');
    });
    expect(result.current.featureFlags.flags.toolApis).toBe(true);

    await act(async () => {
      await result.current.featureFlags.refreshOverrides();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.current.featureFlags.flags.toolApis).toBe(false);
    expect(result.current.featureFlags.flags.hydra).toBe(true);
  });

  test('falls back to defaults when overrides are unavailable', async () => {
    const mockFetch = jest.fn();
    global.fetch = mockFetch as unknown as typeof fetch;

    const { result } = renderHook(
      () => {
        const settings = useSettings();
        const featureFlags = useFeatureFlags();
        return { settings, featureFlags };
      },
      { wrapper: SettingsProvider }
    );

    expect(result.current.featureFlags.flags).toEqual(
      expect.objectContaining(defaultFeatureFlags)
    );

    await act(async () => {
      await result.current.featureFlags.setOverrideUrl('/mock/flags.json');
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.featureFlags.status).toBe('blocked');
    expect(result.current.featureFlags.flags).toEqual(
      expect.objectContaining(defaultFeatureFlags)
    );

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

    await act(async () => {
      result.current.settings.setAllowNetwork(true);
    });

    await act(async () => {
      await result.current.featureFlags.refreshOverrides();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.current.featureFlags.status).toBe('error');
    expect(result.current.featureFlags.flags).toEqual(
      expect.objectContaining(defaultFeatureFlags)
    );
  });
});
