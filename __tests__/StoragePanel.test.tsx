import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StoragePanel from '../apps/settings/storage/StoragePanel';

const mebibyte = 1024 * 1024;
const originalStorage = (navigator as any).storage;

describe('StoragePanel', () => {
  afterEach(() => {
    if (originalStorage === undefined) {
      delete (navigator as any).storage;
    } else {
      Object.defineProperty(navigator, 'storage', {
        configurable: true,
        value: originalStorage,
      });
    }
    jest.clearAllMocks();
  });

  it('renders fallback when the Storage API is unavailable', () => {
    delete (navigator as any).storage;
    render(<StoragePanel />);
    expect(
      screen.getByText(/Storage information is not available/i)
    ).toBeInTheDocument();
  });

  it('shows usage and quota in MiB', async () => {
    const estimate = jest.fn().mockResolvedValue({
      usage: 2 * mebibyte,
      quota: 10 * mebibyte,
    });
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { estimate },
    });

    render(<StoragePanel />);

    await waitFor(() => {
      expect(screen.getByTestId('storage-usage')).toHaveTextContent('2.00 MiB');
      expect(screen.getByTestId('storage-quota')).toHaveTextContent('10.00 MiB');
    });

    expect(estimate).toHaveBeenCalledTimes(1);
  });

  it('updates when a storage event is dispatched', async () => {
    const estimate = jest
      .fn()
      .mockResolvedValueOnce({ usage: 1 * mebibyte, quota: 4 * mebibyte })
      .mockResolvedValueOnce({ usage: 3 * mebibyte, quota: 5 * mebibyte });

    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { estimate },
    });

    render(<StoragePanel />);

    await waitFor(() => {
      expect(screen.getByTestId('storage-usage')).toHaveTextContent('1.00 MiB');
    });

    window.dispatchEvent(new StorageEvent('storage'));

    await waitFor(() => {
      expect(screen.getByTestId('storage-usage')).toHaveTextContent(
        '3.00 MiB'
      );
      expect(screen.getByTestId('storage-quota')).toHaveTextContent(
        '5.00 MiB'
      );
    });

    expect(estimate).toHaveBeenCalledTimes(2);
  });
});
