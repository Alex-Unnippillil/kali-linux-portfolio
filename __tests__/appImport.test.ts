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

describe('dynamic app imports', () => {
  it('imports every app module without error', async () => {
    // TODO: restore terminal import test once jest handles TSX ESM modules
    const ids = Array.from(new Set(apps.map((app) => app.id))).filter(
      (id) => id !== 'terminal'
    );
    const results = await Promise.allSettled(
      ids.map((id) => import(`../components/apps/${id}`))
    );

    const failures = results
      .map((result, index) => ({ result, id: ids[index] }))
      .filter((item) => item.result.status === 'rejected');

    if (failures.length > 0) {
      const messages = failures.map(
        ({ id, result }) => `${id}: ${(result as PromiseRejectedResult).reason}`
      );
      throw new Error(`Failed to import:\n${messages.join('\n')}`);
    }
  });
});
