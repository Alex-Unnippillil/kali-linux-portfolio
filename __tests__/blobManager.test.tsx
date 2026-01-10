import { render, act } from '@testing-library/react';
import React from 'react';
import { blobManager, useBlobUrl } from '@/utils/blobManager';

type Listener = (...args: any[]) => void;
const routeListeners: Record<string, Listener[]> = {};

jest.mock('next/router', () => ({
  __esModule: true,
  default: {
    events: {
      on: jest.fn((event: string, handler: Listener) => {
        routeListeners[event] = routeListeners[event] || [];
        routeListeners[event].push(handler);
      }),
      off: jest.fn((event: string, handler: Listener) => {
        if (!routeListeners[event]) return;
        routeListeners[event] = routeListeners[event].filter((fn) => fn !== handler);
      }),
    },
  },
}));

describe('blobManager', () => {
  beforeEach(() => {
    (global as any).URL.createObjectURL = jest.fn(() => 'blob:test');
    (global as any).URL.revokeObjectURL = jest.fn();
    blobManager.revokeAll();
  });

  test('reference counts and releases URLs when the last consumer releases', () => {
    const blob = new Blob(['test']);
    const url = blobManager.register(blob);
    expect(blobManager.size).toBe(1);
    blobManager.retain(url);
    expect(blobManager.size).toBe(1);
    blobManager.release(url);
    expect(blobManager.size).toBe(1);
    expect((global as any).URL.revokeObjectURL).not.toHaveBeenCalled();
    blobManager.release(url);
    expect(blobManager.size).toBe(0);
    expect((global as any).URL.revokeObjectURL).toHaveBeenCalledWith(url);
  });

  test('useBlobUrl releases URLs on dependency change and unmount', async () => {
    const blob = new Blob(['payload']);

    const Harness: React.FC<{ active: boolean }> = ({ active }) => {
      const resource = active ? blob : null;
      useBlobUrl(resource);
      return null;
    };

    const { rerender, unmount } = render(<Harness active={true} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(blobManager.size).toBe(1);

    rerender(<Harness active={false} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(blobManager.size).toBe(0);
    expect((global as any).URL.revokeObjectURL).toHaveBeenCalledTimes(1);

    unmount();
    expect((global as any).URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  test('cleans up on navigation and memory pressure events', () => {
    const blob = new Blob(['data']);
    const url = blobManager.register(blob);
    expect(blobManager.has(url)).toBe(true);

    window.dispatchEvent(new Event('pagehide'));
    expect(blobManager.has(url)).toBe(false);

    const secondUrl = blobManager.register(blob);
    const handlers = routeListeners['routeChangeStart'];
    expect(handlers?.length).toBeGreaterThan(0);
    handlers?.forEach((handler) => handler());
    expect(blobManager.has(secondUrl)).toBe(false);

    const thirdUrl = blobManager.register(blob);
    window.dispatchEvent(new Event('memorypressure'));
    expect(blobManager.has(thirdUrl)).toBe(false);
    expect((global as any).URL.revokeObjectURL).toHaveBeenCalled();
  });
});
