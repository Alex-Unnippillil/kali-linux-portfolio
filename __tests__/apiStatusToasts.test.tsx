import React from 'react';
import { act, render, screen } from '@testing-library/react';
import ApiStatusToasts from '../components/common/ApiStatusToasts';

jest.mock('workbox-broadcast-update', () => ({
  BroadcastUpdatePlugin: class BroadcastUpdatePlugin {},
}));
jest.mock('workbox-cacheable-response', () => ({
  CacheableResponsePlugin: class CacheableResponsePlugin {},
}));
jest.mock('workbox-expiration', () => ({
  ExpirationPlugin: class ExpirationPlugin {},
}));

const globalAny: any = globalThis;
if (typeof globalAny.self === 'undefined') {
  globalAny.self = globalAny;
}

const runtimeConfig = require('../lib/pwa/runtimeCaching.js');
const { API_BROADCAST_CHANNEL, API_CACHE_NAME } = runtimeConfig;

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  listeners: Set<(event: MessageEvent) => void> = new Set();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.delete(listener);
    }
  }

  postMessage(data: unknown) {
    this.dispatch(data);
  }

  close() {
    this.listeners.clear();
  }

  dispatch(data: unknown) {
    const event = { data } as MessageEvent;
    this.listeners.forEach((listener) => listener(event));
  }
}

declare global {
  // eslint-disable-next-line no-var
  var BroadcastChannel: typeof MockBroadcastChannel | undefined;
}

beforeEach(() => {
  jest.useFakeTimers();
  MockBroadcastChannel.instances = [];
  global.BroadcastChannel = MockBroadcastChannel as unknown as typeof BroadcastChannel;
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  delete (global as any).BroadcastChannel;
});

const dispatchTimeoutEvent = (detail: any) => {
  act(() => {
    window.dispatchEvent(new CustomEvent('fetchproxy-timeout', { detail }));
  });
};

test('shows toast when API request times out', async () => {
  render(<ApiStatusToasts />);

  dispatchTimeoutEvent({ id: 1, url: '/api/demo', method: 'GET', startTime: 0 });

  expect(
    await screen.findByText(/Request to \/api\/demo exceeded/i),
  ).toBeInTheDocument();
});

test('shows toast when background refresh completes', async () => {
  render(<ApiStatusToasts />);

  // Ensure the effect has run and the channel exists
  await act(async () => {
    await Promise.resolve();
  });

  const channel = MockBroadcastChannel.instances.find((c) => c.name === API_BROADCAST_CHANNEL);
  expect(channel).toBeDefined();

  act(() => {
    channel?.dispatch({
      type: 'CACHE_UPDATED',
      payload: { cacheName: API_CACHE_NAME, updatedUrl: '/api/fresh' },
    });
  });

  expect(
    await screen.findByText(/Background refresh completed for \/api\/fresh/i),
  ).toBeInTheDocument();
});
