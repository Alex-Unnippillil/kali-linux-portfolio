import { performance } from 'perf_hooks';
import { calculateVirtualRange } from '../apps/wireshark/utils/virtualization';

describe('calculateVirtualRange', () => {
  it('limits visible rows for large captures', () => {
    const range = calculateVirtualRange(0, 420, 28, 5000, 6);
    const expectedVisible = Math.ceil(420 / 28) + 12; // base + overscan on both ends
    expect(range.visibleCount).toBeLessThanOrEqual(expectedVisible);
    expect(range.start).toBe(0);
  });

  it('clamps the end of the range near the bottom of the list', () => {
    const rowHeight = 28;
    const itemCount = 5000;
    const viewport = 360;
    const scrollTop = itemCount * rowHeight - viewport / 2;
    const range = calculateVirtualRange(scrollTop, viewport, rowHeight, itemCount, 6);
    expect(range.end).toBe(itemCount);
    expect(range.start).toBeLessThan(itemCount);
  });

  it('falls back to a sensible height when measurements are zero', () => {
    const range = calculateVirtualRange(0, 0, 28, 100, 6);
    expect(range.visibleCount).toBeGreaterThan(0);
    expect(range.totalHeight).toBe(2800);
  });

  it('computes ranges efficiently for performance critical scrolling', () => {
    const iterations = 100_000;
    const start = performance.now();
    let result = 0;
    for (let i = 0; i < iterations; i += 1) {
      const range = calculateVirtualRange(i % 5000, 420, 28, 5000, 6);
      result += range.visibleCount;
    }
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(650);
    expect(result).toBeGreaterThan(0);
  });
});
