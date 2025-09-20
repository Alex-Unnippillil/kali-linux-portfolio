export type Waypoint = { x: number; y: number };

const EPSILON = 1e-4;
const DEFAULT_SUBDIVISIONS = 10;

const toCellCenter = (point: Waypoint): Waypoint => ({
  x: point.x + 0.5,
  y: point.y + 0.5,
});

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const catmullRom = (
  p0: Waypoint,
  p1: Waypoint,
  p2: Waypoint,
  p3: Waypoint,
  t: number,
): Waypoint => {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      ((2 * p1.x) +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      ((2 * p1.y) +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
};

const pushDistinct = (points: Waypoint[], point: Waypoint) => {
  const prev = points[points.length - 1];
  if (
    !prev ||
    Math.abs(prev.x - point.x) > EPSILON ||
    Math.abs(prev.y - point.y) > EPSILON
  ) {
    points.push(point);
  }
};

export const computeSmoothedPath = (
  waypoints: Waypoint[],
  subdivisions = DEFAULT_SUBDIVISIONS,
): Waypoint[] => {
  if (!waypoints.length) return [];
  if (waypoints.length === 1) return [toCellCenter(waypoints[0])];

  const centers = waypoints.map(toCellCenter);
  if (centers.length === 2) {
    const [start, end] = centers;
    const result: Waypoint[] = [];
    for (let i = 0; i <= subdivisions; i += 1) {
      const t = i / subdivisions;
      result.push({
        x: lerp(start.x, end.x, t),
        y: lerp(start.y, end.y, t),
      });
    }
    return result;
  }

  const padded = [centers[0], ...centers, centers[centers.length - 1]];
  const result: Waypoint[] = [];

  for (let i = 0; i < centers.length - 1; i += 1) {
    const p0 = padded[i];
    const p1 = padded[i + 1];
    const p2 = padded[i + 2];
    const p3 = padded[i + 3];

    for (let j = 0; j < subdivisions; j += 1) {
      const t = j / subdivisions;
      const point = catmullRom(p0, p1, p2, p3, t);
      pushDistinct(result, point);
    }
  }

  const last = centers[centers.length - 1];
  pushDistinct(result, last);
  return result;
};

export const computePathLength = (path: Waypoint[]) => {
  if (path.length < 2) return 0;
  let length = 0;
  for (let i = 1; i < path.length; i += 1) {
    const prev = path[i - 1];
    const curr = path[i];
    length += Math.hypot(curr.x - prev.x, curr.y - prev.y);
  }
  return length;
};

export const getSegmentLengths = (path: Waypoint[]) => {
  if (path.length < 2) return [] as number[];
  const segments: number[] = [];
  for (let i = 1; i < path.length; i += 1) {
    const prev = path[i - 1];
    const curr = path[i];
    segments.push(Math.hypot(curr.x - prev.x, curr.y - prev.y));
  }
  return segments;
};
