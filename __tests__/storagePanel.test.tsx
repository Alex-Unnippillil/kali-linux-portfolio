import { render, screen, waitFor } from '@testing-library/react';
import StoragePanel from '../apps/resource-monitor/components/StoragePanel';

describe('StoragePanel', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(global.navigator, 'storage');

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(global.navigator, 'storage', originalDescriptor);
    } else {
      delete (global.navigator as any).storage;
    }
  });

  it('highlights usage and shows recommendations when near capacity', async () => {
    const estimateMock = jest.fn().mockResolvedValue({
      usage: 0.9 * 1024 ** 3,
      quota: 1 * 1024 ** 3,
      usageDetails: {
        caches: 0.45 * 1024 ** 3,
        indexedDB: 0.3 * 1024 ** 3,
      },
    });

    Object.defineProperty(global.navigator, 'storage', {
      configurable: true,
      value: { estimate: estimateMock },
    });

    render(<StoragePanel />);

    await waitFor(() =>
      expect(
        screen.getByText(/storage cleanup recommended/i),
      ).toBeInTheDocument(),
    );

    expect(screen.getByTestId('storage-progress-fill')).toHaveClass('bg-amber-400');
  });
});
