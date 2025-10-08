import { renderHook, waitFor } from '@testing-library/react';
import useDailyQuote from '../../hooks/useDailyQuote';

describe('useDailyQuote', () => {
  const originalLocalStorage = globalThis.localStorage;
  let setItemMock: jest.Mock;

  beforeEach(() => {
    let store: Record<string, string> = {};

    setItemMock = jest.fn((key: string, value: string) => {
      store[key] = value;
    });

    const mockStorage: Storage = {
      getItem: jest.fn((key: string) => store[key] ?? null),
      setItem: setItemMock as unknown as Storage['setItem'],
      removeItem: jest.fn((key: string) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
      key: jest.fn(),
      get length() {
        return Object.keys(store).length;
      },
    };

    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    });
    jest.clearAllMocks();
  });

  it('returns a valid quote when filtered pool is empty', async () => {
    const { result } = renderHook(() => useDailyQuote('non-existent-tag'));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const quote = result.current;

    expect(quote?.content).toBeTruthy();
    expect(quote?.author).toBeTruthy();
    expect(setItemMock).toHaveBeenCalledWith(
      'dailyQuote',
      expect.stringContaining('"content"')
    );
  });
});
