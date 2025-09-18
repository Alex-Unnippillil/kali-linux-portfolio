import { createSamplingBridge, __TESTING__ } from '../components/apps/resource_monitor.bridge';

describe('createSamplingBridge', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('falls back to defaults when browser APIs are missing', () => {
    jest.spyOn(Date, 'now').mockReturnValue(4242);
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.6);

    const bridge = createSamplingBridge({});

    expect(bridge.hardwareConcurrency).toBe(__TESTING__.DEFAULT_CONCURRENCY);
    expect(bridge.now()).toBe(4242);
    expect(bridge.usesApproximateMemory).toBe(true);

    const sample = bridge.sampleMemory();
    expect(sample).toBeGreaterThanOrEqual(__TESTING__.MIN_APPROX_MEMORY);
    expect(sample).toBeLessThanOrEqual(__TESTING__.MAX_APPROX_MEMORY);
    expect(randomSpy).toHaveBeenCalled();
  });

  it('uses provided browser APIs when available', () => {
    let currentTime = 100;
    const env = {
      navigator: { hardwareConcurrency: 12 },
      performance: {
        now: jest.fn(() => {
          currentTime += 5;
          return currentTime;
        }),
        memory: {
          usedJSHeapSize: 50,
          totalJSHeapSize: 100,
        },
      },
    };

    const bridge = createSamplingBridge(env as any);

    expect(bridge.hardwareConcurrency).toBe(12);
    expect(bridge.now()).toBe(105);
    expect(env.performance.now).toHaveBeenCalled();
    expect(bridge.usesApproximateMemory).toBe(false);
    expect(bridge.sampleMemory()).toBeCloseTo(50);

    env.performance.memory.usedJSHeapSize = 75;
    expect(bridge.sampleMemory()).toBeCloseTo(75);
  });
});
