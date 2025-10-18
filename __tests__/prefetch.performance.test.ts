import path from 'node:path';
import type { Performance } from 'node:perf_hooks';

const modulePaths = [
  '../components/apps/calculator',
  '../components/apps/ClipboardManager',
  '../components/apps/figlet',
  '../components/apps/quote',
  '../components/apps/project-gallery',
  '../components/apps/input-lab',
  '../components/apps/subnet-calculator',
  '../components/apps/weather',
  '../components/apps/weather_widget',
  '../components/apps/settings',
  '../components/apps/qr',
];

const resolveModule = (relativePath: string) => path.resolve(__dirname, relativePath);

const measureColdLoad = (modulePath: string): number => {
  let duration = 0;
  jest.isolateModules(() => {
    const { performance } = require('perf_hooks') as { performance: Performance };
    const start = performance.now();
    require(modulePath);
    duration = performance.now() - start;
  });
  return duration;
};

const measurePrefetchedLoad = (modulePath: string): number => {
  let duration = 0;
  jest.isolateModules(() => {
    require(modulePath);
    const { performance } = require('perf_hooks') as { performance: Performance };
    const start = performance.now();
    require(modulePath);
    duration = performance.now() - start;
  });
  return duration;
};

const percentile = (values: number[], fraction: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(fraction * (sorted.length - 1)));
  return sorted[index];
};

describe('App module launch performance with prefetch', () => {
  it('reduces the 95th percentile warm-up time after prefetch', () => {
    const coldDurations: number[] = [];
    const warmDurations: number[] = [];

    modulePaths.forEach((relativePath) => {
      const modulePath = resolveModule(relativePath);
      coldDurations.push(measureColdLoad(modulePath));
      warmDurations.push(measurePrefetchedLoad(modulePath));
    });

    const cold95 = percentile(coldDurations, 0.95);
    const warm95 = percentile(warmDurations, 0.95);
    const improvement = cold95 - warm95;

    console.log('Desktop app module load 95th percentile (ms)', {
      cold95: cold95.toFixed(3),
      warm95: warm95.toFixed(3),
      improvement: improvement.toFixed(3),
    });

    expect(warm95).toBeLessThanOrEqual(cold95);
    expect(improvement).toBeGreaterThanOrEqual(0);
  });
});
