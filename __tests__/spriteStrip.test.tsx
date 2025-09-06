import { render } from '@testing-library/react';
import { act } from 'react';
import SpriteStripPreview from '../components/SpriteStripPreview';
import {
  importSpriteStrip,
  clearSpriteStripCache,
  stripCacheSize,
} from '../utils/spriteStrip';

jest.useFakeTimers();

// Minimal 1x1 PNG
const base64Png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAn8B9/4afyoAAAAASUVORK5CYII=';

beforeAll(() => {
  const blob = new Blob([Uint8Array.from(atob(base64Png), (c) => c.charCodeAt(0))], {
    type: 'image/png',
  });
  global.fetch = jest
    .fn(() => Promise.resolve({ blob: () => Promise.resolve(blob) })) as unknown as typeof fetch;
  global.createImageBitmap = jest
    .fn(() => Promise.resolve({ close: jest.fn() })) as unknown as typeof createImageBitmap;
  global.URL.createObjectURL = jest.fn(() => 'blob:mock');
  global.URL.revokeObjectURL = jest.fn();
  global.IntersectionObserver = class {
    private cb: IntersectionObserverCallback;
    constructor(cb: IntersectionObserverCallback) {
      this.cb = cb;
    }
    observe() {
      this.cb([{ isIntersecting: true } as IntersectionObserverEntry]);
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
});

describe('sprite strip utilities', () => {
  test('imports strips with caching', async () => {
    clearSpriteStripCache();
    const p1 = importSpriteStrip('foo.png');
    const p2 = importSpriteStrip('foo.png');
    expect(p1).toBe(p2);
    await p1;
  });

  test('preview advances frames', async () => {
    const { getByTestId } = render(
      <SpriteStripPreview src="foo.png" frameWidth={10} frameHeight={10} frames={3} fps={10} />,
    );
    const el = getByTestId('sprite-strip-preview');
    expect(el).toBeTruthy();
    expect(el).toHaveStyle('background-position: 0px 0px');
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    expect(el).toHaveStyle('background-position: -10px 0px');
  });

  test('releases resources to keep memory stable', async () => {
    clearSpriteStripCache();
    const before = stripCacheSize();
    for (let i = 0; i < 50; i++) {
      const res = await importSpriteStrip('foo.png');
      res.release();
    }
    const after = stripCacheSize();
    expect(after).toBe(before);
  });
});
