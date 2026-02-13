import { renderHook, waitFor } from '@testing-library/react';
import useOPFS from '../hooks/useOPFS.ts';

describe('useOPFS', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    window.navigator,
    'storage',
  );

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(window.navigator, 'storage', originalDescriptor);
    } else {
      delete (window.navigator as Navigator & { storage?: unknown }).storage;
    }
    jest.restoreAllMocks();
  });

  it('gracefully handles environments without storage access', async () => {
    Object.defineProperty(window.navigator, 'storage', {
      configurable: true,
      get: () => undefined,
    });

    const { result } = renderHook(() => useOPFS());

    expect(result.current.supported).toBe(false);
    expect(result.current.root).toBeNull();
    await expect(result.current.getDir()).resolves.toBeNull();
    await expect(result.current.readFile('test.txt')).resolves.toBeNull();
    await expect(result.current.readFile('test.txt', null)).resolves.toBeNull();
    await expect(
      result.current.readFile('test.txt', undefined),
    ).resolves.toBeNull();
    await expect(result.current.writeFile('test.txt', 'data')).resolves.toBe(false);
    await expect(result.current.writeFile('test.txt', 'data', null)).resolves.toBe(false);
    await expect(
      result.current.writeFile('test.txt', 'data', undefined),
    ).resolves.toBe(false);
    await expect(result.current.deleteFile('test.txt')).resolves.toBe(false);
    await expect(result.current.deleteFile('test.txt', null)).resolves.toBe(false);
    await expect(result.current.listFiles()).resolves.toEqual([]);
    await expect(result.current.listFiles(null)).resolves.toEqual([]);
  });

  it('short-circuits when storage permissions are denied', async () => {
    const getDirectory = jest.fn().mockRejectedValue(new Error('denied'));
    Object.defineProperty(window.navigator, 'storage', {
      configurable: true,
      get: () => ({ getDirectory }),
    });

    const { result } = renderHook(() => useOPFS());

    await waitFor(() => {
      expect(getDirectory).toHaveBeenCalled();
    });

    expect(result.current.supported).toBe(true);
    expect(result.current.root).toBeNull();
    await expect(result.current.getDir('subdir')).resolves.toBeNull();
    await expect(result.current.readFile('missing.txt')).resolves.toBeNull();
    await expect(result.current.readFile('missing.txt', null)).resolves.toBeNull();
    await expect(
      result.current.readFile('missing.txt', undefined),
    ).resolves.toBeNull();
    await expect(result.current.writeFile('missing.txt', 'data')).resolves.toBe(false);
    await expect(result.current.writeFile('missing.txt', 'data', null)).resolves.toBe(false);
    await expect(
      result.current.writeFile('missing.txt', 'data', undefined),
    ).resolves.toBe(false);
    await expect(result.current.deleteFile('missing.txt')).resolves.toBe(false);
    await expect(result.current.deleteFile('missing.txt', null)).resolves.toBe(false);
    await expect(result.current.listFiles()).resolves.toEqual([]);
    await expect(result.current.listFiles(null)).resolves.toEqual([]);
  });
});
