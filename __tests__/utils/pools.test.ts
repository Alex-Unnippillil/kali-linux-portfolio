import {
  configureTypedArrayPools,
  getPoolStats,
  releaseTypedArray,
  rentUint8Array,
  resetTypedArrayPools,
} from '../../utils/pools';

describe('typed array pool', () => {
  afterEach(() => {
    resetTypedArrayPools();
  });

  it('reuses buffers after release', () => {
    const first = rentUint8Array(16);
    const initialBuffer = first.buffer;
    first[0] = 42;
    releaseTypedArray(first);

    const second = rentUint8Array(8);
    expect(second.buffer).toBe(initialBuffer);
    releaseTypedArray(second);
  });

  it('enforces configured limits', () => {
    configureTypedArrayPools({ Uint8Array: { maxBuffers: 1 } });
    const a = rentUint8Array(4);
    const b = rentUint8Array(4);
    releaseTypedArray(a);
    releaseTypedArray(b);
    const stats = getPoolStats();
    expect(stats.Uint8Array.available).toBe(1);
  });

  it('tracks hits and misses for telemetry', () => {
    const alpha = rentUint8Array(4);
    releaseTypedArray(alpha);
    const beta = rentUint8Array(4);
    const stats = getPoolStats();
    expect(stats.Uint8Array.misses).toBeGreaterThanOrEqual(1);
    expect(stats.Uint8Array.hits).toBeGreaterThanOrEqual(1);
    releaseTypedArray(beta);
  });
});
