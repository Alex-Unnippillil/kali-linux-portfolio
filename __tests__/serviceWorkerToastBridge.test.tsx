import { act, render, screen } from '@testing-library/react';
import React from 'react';
import ServiceWorkerToastBridge from '../components/common/ServiceWorkerToastBridge';

type StorageWithEstimate = Partial<StorageManager> & { estimate: jest.Mock };

const flushPromises = () => new Promise((resolve) => {
  setTimeout(resolve, 0);
});

describe('ServiceWorkerToastBridge', () => {
  let originalStorage: StorageManager | undefined;
  let originalServiceWorker: ServiceWorkerContainer | undefined;

  beforeEach(() => {
    originalStorage = (navigator as Navigator & { storage?: StorageManager }).storage;
    originalServiceWorker = (navigator as Navigator & { serviceWorker?: ServiceWorkerContainer }).serviceWorker;
    Object.defineProperty(window.navigator, 'storage', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    Object.defineProperty(window.navigator, 'storage', {
      configurable: true,
      value: originalStorage,
    });
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: originalServiceWorker,
    });
  });

  it('renders a storage warning when usage exceeds the threshold', async () => {
    const estimateMock = jest.fn().mockResolvedValue({ usage: 800, quota: 1000 });
    Object.defineProperty(window.navigator, 'storage', {
      configurable: true,
      value: { estimate: estimateMock } as StorageWithEstimate,
    });

    render(<ServiceWorkerToastBridge />);

    await act(async () => {
      await flushPromises();
    });

    expect(await screen.findByText(/Storage is 80% full/)).toBeInTheDocument();
  });

  it('handles storage estimate rejections without surfacing unhandled errors', async () => {
    const estimateMock = jest.fn().mockRejectedValue(new Error('quota exceeded'));
    Object.defineProperty(window.navigator, 'storage', {
      configurable: true,
      value: { estimate: estimateMock } as StorageWithEstimate,
    });

    const unhandledRejections: unknown[] = [];
    const handler = (event: PromiseRejectionEvent) => {
      unhandledRejections.push(event.reason);
    };
    window.addEventListener('unhandledrejection', handler);

    render(<ServiceWorkerToastBridge />);

    await act(async () => {
      await flushPromises();
    });

    window.removeEventListener('unhandledrejection', handler);

    expect(screen.queryByText(/Storage is/)).toBeNull();
    expect(unhandledRejections).toHaveLength(0);
  });

  it('announces cache evictions received from the service worker', async () => {
    const estimateMock = jest.fn().mockResolvedValue({ usage: 100, quota: 1000 });
    Object.defineProperty(window.navigator, 'storage', {
      configurable: true,
      value: { estimate: estimateMock } as StorageWithEstimate,
    });

    const listeners: Record<string, (event: MessageEvent) => void> = {};
    const serviceWorkerStub: Partial<ServiceWorkerContainer> = {
      addEventListener: jest.fn((type: string, callback: EventListenerOrEventListenerObject) => {
        listeners[type] = callback as (event: MessageEvent) => void;
      }),
      removeEventListener: jest.fn((type: string, callback: EventListenerOrEventListenerObject) => {
        if (listeners[type] === callback) {
          delete listeners[type];
        }
      }),
    };

    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: serviceWorkerStub,
    });

    render(<ServiceWorkerToastBridge />);

    await act(async () => {
      await flushPromises();
    });

    await act(async () => {
      listeners.message?.({ data: { type: 'cache-evicted', urls: ['https://example.com/apps/a', 'https://example.com/apps/b'] } } as MessageEvent);
    });

    expect(await screen.findByText(/Removed cached content: \/apps\/a, \/apps\/b\./)).toBeInTheDocument();
  });
});
