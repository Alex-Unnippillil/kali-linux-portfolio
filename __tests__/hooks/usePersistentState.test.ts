import { act, renderHook } from '@testing-library/react';
import usePersistentState, {
  PersistentStateLogEvent,
} from '../../hooks/usePersistentState';

describe('usePersistentState', () => {
  const originalLocalStorage = globalThis.localStorage;
  let store: Record<string, string>;
  let mockStorage: Storage;

  beforeEach(() => {
    store = {};

    mockStorage = {
      getItem: jest.fn((key: string) => (key in store ? store[key] : null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
      }),
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
    } as Storage;

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

  it('loads persisted data when the validator accepts the stored value', () => {
    const key = 'persisted';
    const savedValue = 'from storage';
    store[key] = JSON.stringify(savedValue);

    const logger = jest.fn<(event: PersistentStateLogEvent<string>) => void>();

    const { result } = renderHook(() =>
      usePersistentState<string>(key, 'fallback', {
        validator: (value): value is string => typeof value === 'string',
        onEvent: logger,
      }),
    );

    expect(result.current[0]).toBe(savedValue);
    expect(result.current[4].validationError).toBe(false);
    expect(logger).not.toHaveBeenCalled();
  });

  it('flags a validation error and falls back when the validator rejects stored data', () => {
    const key = 'persisted-invalid';
    store[key] = JSON.stringify(42);

    const logger = jest.fn<(event: PersistentStateLogEvent<string>) => void>();

    const { result } = renderHook(() =>
      usePersistentState<string>(key, 'fallback', {
        validator: (value): value is string => typeof value === 'string',
        onEvent: logger,
      }),
    );

    expect(result.current[0]).toBe('fallback');
    expect(result.current[4].validationError).toBe(true);
    expect(logger).toHaveBeenCalledWith({
      type: 'validation-rejected',
      key,
      value: 42,
    });

    act(() => {
      result.current[1]('next');
    });

    expect(result.current[0]).toBe('next');
    expect(result.current[4].validationError).toBe(false);

    act(() => {
      result.current[4].clearValidationError();
    });

    expect(result.current[4].validationError).toBe(false);
  });
});

