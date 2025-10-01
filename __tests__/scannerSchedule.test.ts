import { jest } from '@jest/globals';
import type { DeviceCapabilities } from '../utils/capabilities';

const baseCapabilities: DeviceCapabilities = {
  battery: {
    supported: false,
    saver: false,
    timestamp: 0,
  },
  hardware: {
    cores: 4,
    memory: 4,
    cpuClass: 'mid',
  },
  network: {
    saveData: false,
    effectiveType: '4g',
  },
  platform: {
    os: 'linux',
    isMobile: false,
    hints: [],
  },
  performance: {
    mode: 'auto',
    shouldThrottle: false,
    intervalMultiplier: 1,
    maxConcurrency: Number.POSITIVE_INFINITY,
    reasons: [],
    lastInputLatency: null,
  },
};

const listeners: ((caps: DeviceCapabilities) => void)[] = [];
let currentCaps: DeviceCapabilities = { ...baseCapabilities };

jest.mock('../utils/capabilities', () => ({
  getCachedCapabilities: jest.fn(() => currentCaps),
  loadCapabilities: jest.fn(() => Promise.resolve(currentCaps)),
  onCapabilitiesChange: jest.fn((listener: (caps: DeviceCapabilities) => void) => {
    listeners.push(listener);
    listener(currentCaps);
    return () => {
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    };
  }),
}));

const setCapabilities = (caps: DeviceCapabilities) => {
  currentCaps = caps;
  listeners.forEach((listener) => listener(caps));
};

const restoreCapabilities = () => {
  setCapabilities({ ...baseCapabilities });
};

import {
  scheduleScan,
  loadScheduledScans,
  clearSchedules,
  __getSchedulerStateForTests,
  __getRunningScansForTests,
  __setTestCapabilitiesOverride,
  __attemptExecuteForTests,
} from '../scanner/schedule';

describe('scan scheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearSchedules();
    localStorage.clear();
    restoreCapabilities();
    __setTestCapabilitiesOverride(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('stores scheduled scans in localStorage', () => {
    const fn = jest.fn();
    scheduleScan('1', '*/2 * * * * *', fn);
    expect(loadScheduledScans()).toEqual([
      { id: '1', schedule: '*/2 * * * * *' },
    ]);
  });

  test('triggers scans based on interval', () => {
    const fn = jest.fn();
    scheduleScan('1', '*/2 * * * * *', fn);
    jest.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('slows scan cadence when capabilities recommend throttling', () => {
    expect(typeof window).not.toBe('undefined');
    const throttledCaps: DeviceCapabilities = {
      battery: baseCapabilities.battery,
      hardware: baseCapabilities.hardware,
      network: baseCapabilities.network,
      platform: baseCapabilities.platform,
      performance: {
        mode: 'auto',
        shouldThrottle: true,
        intervalMultiplier: 3,
        maxConcurrency: 1,
        reasons: ['battery-saver'],
        lastInputLatency: null,
      },
    };
    expect(throttledCaps.performance.intervalMultiplier).toBe(3);
    __setTestCapabilitiesOverride(throttledCaps);
    setCapabilities(throttledCaps);
    expect(currentCaps.performance.intervalMultiplier).toBe(3);
    expect(__getSchedulerStateForTests().intervalMultiplier).toBe(3);
    const fn = jest.fn();
    scheduleScan('slow', '*/1 * * * * *', fn);
    const job = __getRunningScansForTests()[0];
    expect(job.remainingDelay).toBeGreaterThan(0);
    jest.advanceTimersByTime(2000);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('limits concurrent asynchronous scans when throttled', async () => {
    const limitedCaps: DeviceCapabilities = {
      battery: baseCapabilities.battery,
      hardware: baseCapabilities.hardware,
      network: baseCapabilities.network,
      platform: baseCapabilities.platform,
      performance: {
        mode: 'auto',
        shouldThrottle: true,
        intervalMultiplier: 1,
        maxConcurrency: 1,
        reasons: ['low-hardware'],
        lastInputLatency: null,
      },
    };
    __setTestCapabilitiesOverride(limitedCaps);
    setCapabilities(limitedCaps);

    const asyncFn = jest.fn();
    const fastFn = jest.fn();

    scheduleScan('async', '*/1 * * * * *', asyncFn);
    scheduleScan('fast', '*/1 * * * * *', fastFn);
    const jobs = __getRunningScansForTests();
    expect(jobs).toHaveLength(2);
    jobs[0].active = true;
    expect(__attemptExecuteForTests(1)).toBe(false);
    jobs[0].active = false;
    expect(__attemptExecuteForTests(0)).toBe(true);
    expect(asyncFn).toHaveBeenCalledTimes(1);
    expect(__attemptExecuteForTests(1)).toBe(true);
    expect(fastFn).toHaveBeenCalled();
  });
});
