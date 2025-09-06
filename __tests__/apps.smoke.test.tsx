import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import apps from '../apps.config.js';

// Some apps import this package which isn't installed in the test env
jest.mock('styled-jsx/style', () => () => null, { virtual: true });

// Mock browser APIs that may be missing in the Jest environment
beforeAll(() => {
  // Some apps rely on canvas APIs which aren't implemented in jsdom
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({ data: [] })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    fillText: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
  }));

  // mock fetch for components that request external resources
  (global as any).fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({}) })
  );

  // basic Worker mock for components using web workers
  class WorkerMock {
    onmessage: ((e: any) => void) | null = null;
    postMessage() {}
    terminate() {}
    addEventListener() {}
    removeEventListener() {}
  }
  (global as any).Worker = WorkerMock;

  // matchMedia mock
  window.matchMedia =
    window.matchMedia ||
    ((query: string) => ({
      matches: false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    }));
});

describe('App component smoke tests', () => {
  const noop = () => {};

  const skip = new Set(['resource-monitor', 'todoist']);

  apps
    .filter(
      (app) =>
        !app.disabled &&
        typeof app.screen === 'function' &&
        !skip.has(app.id)
    )
    .forEach((app) => {
      it(`opens ${app.title || app.id}`, async () => {
        await app.screen.prefetch?.();
        const { container, unmount } = render(app.screen(noop, noop));
        fireEvent.click(container);
        unmount();
      });
    });
});
