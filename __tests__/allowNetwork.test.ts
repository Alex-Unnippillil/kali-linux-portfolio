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
    window.localStorage.setItem('allow-network', 'false');
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
    window.localStorage.setItem('allow-network', 'false');
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
    window.localStorage.setItem('allow-network', 'false');
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

  test('enables networking on a fresh visit without an extra consent click', async () => {
    const { result } = renderSettings();
    await waitFor(() => expect(result.current.allowNetwork).toBe(true));
    expect(window.localStorage.getItem('allow-network')).toBe('true');
    await expect(window.fetch('https://external.com')).resolves.toBe('ok');
  });

  test('does not overwrite a saved enabled preference during startup', async () => {
    window.localStorage.setItem('allow-network', 'true');
    const { result } = renderSettings();
    // The placeholder must not be written before the asynchronous load completes.
    expect(window.localStorage.getItem('allow-network')).toBe('true');
    await waitFor(() => expect(result.current.allowNetwork).toBe(true));
    expect(window.localStorage.getItem('allow-network')).toBe('true');
  });

  test('keeps a user opt-out disabled after remounting the provider', async () => {
    const first = renderSettings();
    await waitFor(() => expect(first.result.current.allowNetwork).toBe(true));
    act(() => first.result.current.setAllowNetwork(false));
    expect(window.localStorage.getItem('allow-network')).toBe('false');
    first.unmount();
    // Simulate a new document with its native fetch implementation.
    window.fetch = fetchSpy as typeof fetch;
    const second = renderSettings();
    await act(async () => {});
    expect(second.result.current.allowNetwork).toBe(false);
    expect(window.localStorage.getItem('allow-network')).toBe('false');
    await expect(window.fetch('https://external.com')).rejects.toThrow(
      'Network requests disabled',
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
