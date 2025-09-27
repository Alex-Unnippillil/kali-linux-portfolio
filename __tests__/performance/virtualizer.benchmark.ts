import { Virtualizer } from '@tanstack/virtual-core';

type StubScrollElement = HTMLElement & {
  clientHeight: number;
  clientWidth: number;
  scrollTop: number;
  addEventListener: () => void;
  removeEventListener: () => void;
};

function createScrollElement(height: number, width = 200): StubScrollElement {
  const el = document.createElement('div') as StubScrollElement;
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: height });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: width });
  Object.defineProperty(el, 'scrollTop', { configurable: true, value: 0, writable: true });
  el.addEventListener = () => {};
  el.removeEventListener = () => {};
  return el;
}

function createVirtualizer(count: number, viewportHeight: number) {
  const scrollElement = createScrollElement(viewportHeight);
  let virtualizer: Virtualizer<HTMLElement, HTMLElement>;

  virtualizer = new Virtualizer<HTMLElement, HTMLElement>({
    count,
    getScrollElement: () => scrollElement,
    estimateSize: () => 32,
    overscan: 4,
    initialRect: { height: viewportHeight, width: scrollElement.clientWidth },
    measureElement: (el) => Number((el as HTMLElement).dataset.size ?? 32),
    indexAttribute: 'data-index',
    scrollToFn: () => {},
    observeElementRect: (_instance, cb) => {
      cb({ height: viewportHeight, width: scrollElement.clientWidth });
      return () => {};
    },
    observeElementOffset: (_instance, cb) => {
      cb(scrollElement.scrollTop, false);
      return () => {};
    },
  });

  const cleanup = virtualizer._didMount();
  virtualizer.measure();

  return { virtualizer, cleanup };
}

describe('virtualizer baseline characteristics', () => {
  test('only a slice of items are materialised per viewport', () => {
    const { virtualizer, cleanup } = createVirtualizer(1000, 200);
    const rendered = virtualizer.getVirtualItems().length;
    cleanup();
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(80);
  });

  test('dynamic size adjustments update the total measurement', () => {
    const { virtualizer, cleanup } = createVirtualizer(40, 200);
    virtualizer.getVirtualItems();
    virtualizer.resizeItem(0, 64);
    virtualizer._willUpdate();
    virtualizer.measure();
    const measurement = virtualizer.measurementsCache[0]?.size ?? 0;
    cleanup();
    expect(measurement).toBeGreaterThanOrEqual(64);
  });

  test('getVirtualItems throughput benchmark', () => {
    const { virtualizer, cleanup } = createVirtualizer(5000, 240);
    const start = performance.now();
    for (let i = 0; i < 2000; i++) {
      virtualizer.getVirtualItems();
    }
    const elapsed = performance.now() - start;
    cleanup();
    console.log(`virtualizer getVirtualItems benchmark: ${elapsed.toFixed(2)}ms`);
  });
});
