import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';

const defineNavigatorStorage = (estimate: jest.Mock) => {
  const descriptor = Object.getOwnPropertyDescriptor(window.navigator, 'storage');
  if (descriptor?.configurable === false) {
    throw new Error('navigator.storage is not configurable in this environment');
  }
  Object.defineProperty(window.navigator, 'storage', {
    configurable: true,
    value: {
      estimate,
    },
  });
  return () => {
    if (descriptor) Object.defineProperty(window.navigator, 'storage', descriptor);
    else delete (window.navigator as any).storage;
  };
};

describe('StorageMeter', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders warning when usage exceeds 80% of quota', async () => {
    const estimate = jest
      .fn()
      .mockResolvedValueOnce({ usage: 900 * 1024 * 1024, quota: 1000 * 1024 * 1024, usageDetails: {} });
    const restore = defineNavigatorStorage(estimate);

    try {
      const { default: StorageMeter } = await import('../components/common/StorageMeter');

      render(<StorageMeter />);

      await waitFor(() => {
        expect(screen.getByText(/90% used/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Storage is 90% full/i)).toBeInTheDocument();
    } finally {
      restore();
    }
  });

  it('updates meter after storage operations trigger a quota refresh', async () => {
    const estimate = jest
      .fn()
      .mockResolvedValueOnce({ usage: 200 * 1024 * 1024, quota: 1000 * 1024 * 1024, usageDetails: {} })
      .mockResolvedValueOnce({ usage: 900 * 1024 * 1024, quota: 1000 * 1024 * 1024, usageDetails: {} });
    const restore = defineNavigatorStorage(estimate);

    try {
      const { default: StorageMeter } = await import('../components/common/StorageMeter');
      const { saveScans } = await import('../utils/qrStorage');

      render(<StorageMeter />);

      await waitFor(() => {
        expect(screen.getByText(/20% used/i)).toBeInTheDocument();
      });

      await act(async () => {
        await saveScans(['https://example.com']);
      });

      await waitFor(() => {
        expect(screen.getByText(/90% used/i)).toBeInTheDocument();
      });
      expect(estimate).toHaveBeenCalledTimes(2);
    } finally {
      restore();
    }
  });
});
