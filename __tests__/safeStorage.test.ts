import {
  createSafeStorage,
  safeLocalStorage,
  safeSessionStorage,
  SafeStorageBackend,
} from '../utils/safeStorage';

describe('createSafeStorage', () => {
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it('returns localStorage by default', () => {
    expect(createSafeStorage()).toBe(window.localStorage);
  });

  it('returns sessionStorage when requested', () => {
    expect(createSafeStorage({ backend: 'session' })).toBe(
      window.sessionStorage
    );
  });

  it('exposes pre-created helpers', () => {
    expect(safeLocalStorage).toBe(window.localStorage);
    expect(safeSessionStorage).toBe(window.sessionStorage);
  });

  it('returns undefined when the backend throws during access', () => {
    const originalValue = window.sessionStorage;
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'sessionStorage'
    );

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get() {
        throw new Error('blocked');
      },
    });

    expect(createSafeStorage({ backend: 'session' })).toBeUndefined();

    if (originalDescriptor) {
      Object.defineProperty(window, 'sessionStorage', originalDescriptor);
    } else {
      Object.defineProperty(window, 'sessionStorage', {
        configurable: true,
        enumerable: true,
        value: originalValue,
        writable: true,
      });
    }
  });

  it('returns undefined when storage operations are blocked', () => {
    const originalValue = window.localStorage;
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'localStorage'
    );

    const failingStorage: Storage = {
      length: 0,
      clear: jest.fn(),
      getItem: jest.fn(),
      key: jest.fn(),
      removeItem: jest.fn(),
      setItem() {
        throw new Error('quota');
      },
    };

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        return failingStorage;
      },
    });

    expect(createSafeStorage()).toBeUndefined();

    if (originalDescriptor) {
      Object.defineProperty(window, 'localStorage', originalDescriptor);
    } else {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        enumerable: true,
        value: originalValue,
        writable: true,
      });
    }
  });

  describe.each([
    ['local', () => window.localStorage],
    ['session', () => window.sessionStorage],
  ] as const)('backend %s', (backend, getNative) => {
    it('reads and writes using the selected backend', () => {
      const storage = createSafeStorage({ backend: backend as SafeStorageBackend });
      expect(storage).toBe(getNative());

      const KEY = '__safe-storage-test__';
      storage?.setItem(KEY, 'value');
      expect(getNative().getItem(KEY)).toBe('value');

      storage?.removeItem(KEY);
      expect(getNative().getItem(KEY)).toBeNull();
    });
  });
});
