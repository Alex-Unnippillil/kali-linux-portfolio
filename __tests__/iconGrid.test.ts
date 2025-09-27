/** @jest-environment node */

import {
  GRID_CONFIG,
  calculateGridMetrics,
  resolveGridConflicts,
  snapPixelToGrid,
  positionsAreEqual,
} from '../components/shell/iconGrid';

describe('icon grid utilities', () => {
  test('calculateGridMetrics computes columns and rows based on container size', () => {
    const metrics = calculateGridMetrics(640, 480, 12, GRID_CONFIG.regular);
    expect(metrics.columns).toBeGreaterThan(1);
    expect(metrics.rows).toBeGreaterThan(1);
    const compactMetrics = calculateGridMetrics(320, 240, 3, GRID_CONFIG.compact);
    expect(compactMetrics.columns).toBeGreaterThanOrEqual(1);
    expect(compactMetrics.rows).toBeGreaterThanOrEqual(1);
  });

  test('snapPixelToGrid rounds pixel coordinates to nearest cell', () => {
    const metrics = calculateGridMetrics(400, 400, 4, GRID_CONFIG.regular);
    const snapped = snapPixelToGrid(120, 120, metrics, GRID_CONFIG.regular);
    expect(snapped.column).toBeGreaterThanOrEqual(0);
    expect(snapped.row).toBeGreaterThanOrEqual(0);
    const snappedEdge = snapPixelToGrid(-10, -10, metrics, GRID_CONFIG.regular);
    expect(snappedEdge.column).toBe(0);
    expect(snappedEdge.row).toBe(0);
  });

  test('resolveGridConflicts preserves icon order and avoids collisions', () => {
    const metrics = calculateGridMetrics(600, 600, 5, GRID_CONFIG.regular);
    const draft = {
      a: { column: 0, row: 0 },
      b: { column: 0, row: 0 },
      c: { column: 1, row: 0 },
      d: { column: 1, row: 1 },
      e: { column: 2, row: 0 },
    };
    const resolved = resolveGridConflicts(draft, ['a', 'b', 'c', 'd', 'e'], metrics);
    const cells = new Set(
      Object.values(resolved).map((pos) => `${pos.column}:${pos.row}`),
    );
    expect(cells.size).toBe(Object.keys(resolved).length);
    expect(resolved.a.column).toBe(0);
    expect(resolved.a.row).toBe(0);
  });

  test('positionsAreEqual detects equal maps', () => {
    const metrics = calculateGridMetrics(400, 400, 2, GRID_CONFIG.regular);
    const base = resolveGridConflicts({ a: { column: 0, row: 0 } }, ['a'], metrics);
    expect(positionsAreEqual(base, base)).toBe(true);
    const different = { ...base, a: { column: 1, row: 0 } };
    expect(positionsAreEqual(base, different)).toBe(false);
  });
});
