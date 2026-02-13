import {
  initializeScrollTracker,
  MARKETING_OPT_OUT_STORAGE_KEY,
  discoverSectionsFromDom,
} from '../utils/scroll-tracker';

class MockIntersectionObserver implements Partial<IntersectionObserver> {
  static instances: MockIntersectionObserver[] = [];

  readonly observe = jest.fn((element: Element) => {
    this.observedElements.add(element);
  });

  readonly unobserve = jest.fn();

  readonly disconnect = jest.fn();

  readonly callback: IntersectionObserverCallback;

  readonly options?: IntersectionObserverInit;

  readonly observedElements = new Set<Element>();

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  trigger(entries: Array<Partial<IntersectionObserverEntry> & { target: Element }>): void {
    const normalized = entries.map((entry) => {
      const rect =
        entry.boundingClientRect ??
        (entry.target.getBoundingClientRect?.() ??
          ({
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            toJSON() {
              return {};
            },
          } as DOMRect));

      const ratio =
        typeof entry.intersectionRatio === 'number'
          ? entry.intersectionRatio
          : entry.isIntersecting
          ? 1
          : 0;

      return {
        time: entry.time ?? 0,
        target: entry.target,
        boundingClientRect: rect,
        intersectionRect: entry.intersectionRect ?? rect,
        intersectionRatio: ratio,
        isIntersecting: entry.isIntersecting ?? ratio > 0,
        rootBounds: entry.rootBounds ?? null,
      } satisfies IntersectionObserverEntry;
    });

    this.callback(normalized, this as unknown as IntersectionObserver);
  }
}

describe('scroll tracker', () => {
  const getMutableWindow = () => window as typeof window & { IntersectionObserver?: typeof MockIntersectionObserver };

  const restoreObserver = () => {
    delete getMutableWindow().IntersectionObserver;
    MockIntersectionObserver.instances = [];
  };

  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    window.__KALI_MARKETING__ = undefined;
    localStorage.clear();
    restoreObserver();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    restoreObserver();
  });

  const createSection = (id: string): HTMLElement => {
    const element = document.createElement('section');
    element.id = id;
    document.body.appendChild(element);
    return element;
  };

  it('dispatches debounced analytics events when sections enter view', () => {
    getMutableWindow().IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;

    const hero = createSection('hero');
    const analyticsDispatch = jest.fn();

    initializeScrollTracker({
      sections: [
        {
          id: 'hero',
          element: hero,
          trackOn: 'enter',
          once: true,
          threshold: 0.5,
          analytics: { category: 'Marketing', action: 'section_visible', label: 'hero' },
        },
      ],
      debounceMs: 10,
      analyticsDispatcher: analyticsDispatch,
      shouldTrack: () => true,
    });

    const observerInstance = MockIntersectionObserver.instances[0];
    observerInstance.trigger([
      { target: hero, intersectionRatio: 0.8, isIntersecting: true },
    ]);

    jest.advanceTimersByTime(15);

    expect(analyticsDispatch).toHaveBeenCalledTimes(1);
    expect(analyticsDispatch).toHaveBeenCalledWith({
      category: 'Marketing',
      action: 'section_visible',
      label: 'hero',
    });
  });

  it('skips analytics when opt-out flag is set', () => {
    getMutableWindow().IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;

    const hero = createSection('hero');
    const analyticsDispatch = jest.fn();

    localStorage.setItem(MARKETING_OPT_OUT_STORAGE_KEY, 'true');
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'true';

    initializeScrollTracker({
      sections: [
        {
          id: 'hero',
          element: hero,
          trackOn: 'enter',
          once: true,
          threshold: 0.25,
          analytics: { category: 'Marketing', action: 'section_visible', label: 'hero' },
        },
      ],
      debounceMs: 5,
      analyticsDispatcher: analyticsDispatch,
    });

    const observerInstance = MockIntersectionObserver.instances[0];
    observerInstance.trigger([
      { target: hero, intersectionRatio: 1, isIntersecting: true },
    ]);

    jest.advanceTimersByTime(10);

    expect(analyticsDispatch).not.toHaveBeenCalled();
  });

  it('derives section configuration from DOM data attributes', () => {
    const hero = createSection('hero');
    hero.dataset.scrollSection = 'hero';
    hero.dataset.scrollCategory = 'Marketing';
    hero.dataset.scrollAction = 'hero_visible';
    hero.dataset.scrollLabel = 'Hero Banner';
    hero.dataset.scrollThreshold = '0.45';
    hero.dataset.scrollTrack = 'both';
    hero.dataset.scrollExitAction = 'hero_hidden';

    const sections = discoverSectionsFromDom();
    expect(sections).toHaveLength(1);
    const [section] = sections;
    expect(section.id).toBe('hero');
    expect(section.threshold).toBeCloseTo(0.45, 2);
    expect(section.trackOn).toBe('both');
    expect(section.analytics).toMatchObject({
      enter: { category: 'Marketing', action: 'hero_visible', label: 'Hero Banner' },
      exit: { category: 'Marketing', action: 'hero_hidden', label: 'Hero Banner' },
    });
  });

  it('falls back to scroll listeners when IntersectionObserver is unavailable', () => {
    const originalRaf = window.requestAnimationFrame;
    const originalCancel = window.cancelAnimationFrame;
    (window as any).requestAnimationFrame = (cb: FrameRequestCallback) => {
      cb(performance.now());
      return 1;
    };
    (window as any).cancelAnimationFrame = () => {};

    const hero = createSection('hero');
    Object.defineProperty(hero, 'getBoundingClientRect', {
      value: () => ({
        top: 0,
        left: 0,
        right: 200,
        bottom: 200,
        width: 200,
        height: 200,
        x: 0,
        y: 0,
        toJSON() {
          return {};
        },
      }),
    });

    const analyticsDispatch = jest.fn();

    initializeScrollTracker({
      sections: [
        {
          id: 'hero',
          element: hero,
          trackOn: 'enter',
          once: true,
          threshold: 0.5,
          analytics: { category: 'Marketing', action: 'section_visible', label: 'hero' },
        },
      ],
      debounceMs: 5,
      analyticsDispatcher: analyticsDispatch,
      shouldTrack: () => true,
    });

    jest.advanceTimersByTime(10);

    expect(analyticsDispatch).toHaveBeenCalledTimes(1);

    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancel;
  });

  it('refreshes tracked sections dynamically', () => {
    getMutableWindow().IntersectionObserver =
      MockIntersectionObserver as unknown as typeof IntersectionObserver;

    const hero = createSection('hero');
    const analyticsDispatch = jest.fn();

    const tracker = initializeScrollTracker({
      sections: [],
      debounceMs: 5,
      analyticsDispatcher: analyticsDispatch,
      shouldTrack: () => true,
    });

    tracker.refresh([
      {
        id: 'hero',
        element: hero,
        trackOn: 'enter',
        once: true,
        threshold: 0.5,
        analytics: { category: 'Marketing', action: 'section_visible', label: 'hero' },
      },
    ]);

    const observerInstance = MockIntersectionObserver.instances.slice(-1)[0];
    observerInstance.trigger([
      { target: hero, intersectionRatio: 0.75, isIntersecting: true },
    ]);

    jest.advanceTimersByTime(10);

    expect(analyticsDispatch).toHaveBeenCalledTimes(1);
  });
});
