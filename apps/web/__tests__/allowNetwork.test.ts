import { renderHook, act, waitFor } from '@testing-library/react';
import { SettingsProvider, useSettings } from '../hooks/useSettings';

describe('SettingsProvider allowNetwork fetch guard', () => {
  let originalFetch: typeof fetch | undefined;
  let fetchSpy: jest.Mock;

  beforeEach(() => {
    originalFetch = window.fetch;
    fetchSpy = jest.fn(() => Promise.resolve('ok'));
    // @ts-expect-error - jest mock assignment
    window.fetch = fetchSpy;
    window.localStorage.clear();
  });

  afterEach(() => {
    if (originalFetch) {
      window.fetch = originalFetch;
    } else {
      // @ts-expect-error - align with jsdom typings
      delete window.fetch;
    }
    jest.resetAllMocks();
  });

  const renderSettings = () =>
    renderHook(() => useSettings(), {
      wrapper: SettingsProvider,
    });

  test('normalizes URLs before blocking off-origin requests', async () => {
    const { result } = renderSettings();

    await waitFor(() => expect(window.fetch).not.toBe(fetchSpy));
    const blockedFetch = window.fetch;

    await expect(window.fetch('//external.com')).rejects.toThrow(
      'Network requests disabled',
    );
    await expect(window.fetch('HTTPS://external.com')).rejects.toThrow(
      'Network requests disabled',
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    const sameOriginPromise = window.fetch('/api/data');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/data');
    await expect(sameOriginPromise).resolves.toBe('ok');

    act(() => {
      result.current.setAllowNetwork(true);
    });

    await waitFor(() => expect(window.fetch).not.toBe(blockedFetch));

    fetchSpy.mockClear();
    await expect(window.fetch('//external.com')).resolves.toBe('ok');
    await expect(window.fetch('HTTPS://external.com')).resolves.toBe('ok');
    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual([
      '//external.com',
      'HTTPS://external.com',
    ]);
  });

  test('handles Request objects when blocking network access', async () => {
    if (typeof Request === 'undefined') {
      return;
    }

    renderSettings();
    await waitFor(() => expect(window.fetch).not.toBe(fetchSpy));

    const request = new Request('https://external.com/resource');
    await expect(window.fetch(request)).rejects.toThrow('Network requests disabled');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('restores original fetch implementation when re-enabled', async () => {
    const { result } = renderSettings();

    await waitFor(() => expect(window.fetch).not.toBe(fetchSpy));
    const disabledFetch = window.fetch;

    act(() => {
      result.current.setAllowNetwork(true);
    });
    await waitFor(() => expect(window.fetch).not.toBe(disabledFetch));
    fetchSpy.mockClear();
    await expect(window.fetch('/allowed')).resolves.toBe('ok');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe('/allowed');
    const restoredFetch = window.fetch;

    act(() => {
      result.current.setAllowNetwork(false);
    });
    await waitFor(() => expect(window.fetch).not.toBe(restoredFetch));
    fetchSpy.mockClear();
    await expect(window.fetch('https://external.com')).rejects.toThrow(
      'Network requests disabled',
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    act(() => {
      result.current.setAllowNetwork(true);
    });
    await waitFor(() => expect(window.fetch).toBe(restoredFetch));
    fetchSpy.mockClear();
    await expect(window.fetch('https://external.com')).resolves.toBe('ok');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0][0]).toBe('https://external.com');
  });
});
