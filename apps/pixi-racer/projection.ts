export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  w: number;
  scale: number;
}

export interface Segment {
  index: number;
  p1: Point3D;
  p2: Point3D;
  curve: number;
  y: number;
}

export const segmentLength = 200;

export function project(
  p: Point3D,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraDepth: number,
  width: number,
  height: number
): ProjectedPoint {
  const dz = p.z - cameraZ;
  const scale = cameraDepth / dz;
  const x = (1 + (p.x - cameraX) * scale) * width * 0.5;
  const y = (1 - (p.y - cameraY) * scale) * height * 0.5;
  const w = scale * width * 0.5;
  return { x, y, w, scale };
}

export function findSegment(z: number, segments: Segment[]): Segment {
  const i = Math.floor(z / segmentLength) % segments.length;
  return segments[i];
}
