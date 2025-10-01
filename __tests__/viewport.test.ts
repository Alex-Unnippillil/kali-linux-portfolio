type MockInstance = {
  observe: jest.Mock;
  unobserve: jest.Mock;
  disconnect: jest.Mock;
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  trigger(entries: IntersectionObserverEntry[]): void;
};

describe('observeViewport', () => {
  type ObserveViewport = typeof import('../utils/viewport')['observeViewport'];
  let observeViewport: ObserveViewport;
  let instances: MockInstance[];
  const originalIntersectionObserver = global.IntersectionObserver;

  beforeEach(async () => {
    jest.resetModules();
    instances = [];

    class MockIntersectionObserver {
      public observe = jest.fn();
      public unobserve = jest.fn();
      public disconnect = jest.fn();
      public callback: IntersectionObserverCallback;
      public options?: IntersectionObserverInit;

      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        this.callback = callback;
        this.options = options;
        instances.push(this as unknown as MockInstance);
      }

      trigger(entries: IntersectionObserverEntry[]) {
        this.callback(entries, this as unknown as IntersectionObserver);
      }
    }

    (global as any).IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
    ({ observeViewport } = await import('../utils/viewport'));
  });

  afterEach(() => {
    if (originalIntersectionObserver) {
      (global as any).IntersectionObserver = originalIntersectionObserver as typeof IntersectionObserver;
    } else {
      delete (global as any).IntersectionObserver;
    }
  });

  it('reuses a single observer for many targets sharing the same viewport options', () => {
    const elements = Array.from({ length: 50 }, () => document.createElement('div'));
    const unsubscribers = elements.map((el) => observeViewport(el, () => {}));

    expect(instances).toHaveLength(1);
    const [instance] = instances;
    expect(instance.observe).toHaveBeenCalledTimes(elements.length);
    elements.forEach((el) => {
      expect(instance.observe).toHaveBeenCalledWith(el);
    });

    unsubscribers.forEach((unsubscribe) => unsubscribe());
    expect(instance.unobserve).toHaveBeenCalledTimes(elements.length);
    expect(instance.disconnect).toHaveBeenCalledTimes(1);
  });

  it('disconnects the shared observer when the final subscriber unsubscribes', () => {
    const root = document.createElement('div');
    const first = document.createElement('div');
    const second = document.createElement('div');

    const unsubscribeFirst = observeViewport(first, () => {}, { root, threshold: 0.5 });
    const unsubscribeSecond = observeViewport(second, () => {}, { root, threshold: 0.5 });

    expect(instances).toHaveLength(1);
    const [instance] = instances;
    expect(instance.observe).toHaveBeenCalledTimes(2);

    unsubscribeFirst();
    expect(instance.unobserve).toHaveBeenCalledWith(first);
    expect(instance.disconnect).not.toHaveBeenCalled();

    unsubscribeSecond();
    expect(instance.unobserve).toHaveBeenCalledWith(second);
    expect(instance.disconnect).toHaveBeenCalledTimes(1);
  });
});
