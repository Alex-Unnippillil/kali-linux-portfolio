import {
  project,
  findSegment,
  segmentLength,
  Segment,
} from '../apps/pixi-racer/projection';

test('projection scales with distance', () => {
  const camera = { x: 0, y: 0, z: 0 };
  const near = project(
    { x: 0, y: 0, z: 200 },
    camera.x,
    camera.y,
    camera.z,
    1,
    800,
    600
  );
  const far = project(
    { x: 0, y: 0, z: 400 },
    camera.x,
    camera.y,
    camera.z,
    1,
    800,
    600
  );
  expect(far.scale).toBeLessThan(near.scale);
  expect(far.w).toBeLessThan(near.w);
});

test('segment transitions wrap track length', () => {
  const segments: Segment[] = Array.from({ length: 5 }, (_, i) => ({
    index: i,
    curve: 0,
    y: 0,
    p1: { x: 0, y: 0, z: i * segmentLength },
    p2: { x: 0, y: 0, z: (i + 1) * segmentLength },
  }));
  const seg = findSegment(5 * segmentLength + 50, segments);
  expect(seg.index).toBe(0);
});
