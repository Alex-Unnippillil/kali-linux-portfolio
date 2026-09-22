export const WIDTH = 420;
export const HEIGHT = 740;
export const BALL_RADIUS = 9;
export const SHOOTER = { x: 394, y: 690 };
export const LEFT_PIVOT = { x: 104, y: 626 };
export const RIGHT_PIVOT = { x: 290, y: 626 };
export const FLIPPER_LENGTH = 77;
export const REST_ANGLE = 0.38;
export const ACTIVE_ANGLE = -0.55;
export type Point = { x: number; y: number };
export type Rail = readonly [number, number, number, number];
/** The renderer and collider builder consume exactly the same rail geometry. */
export const RAILS: readonly Rail[] = [
  [12, 184, 12, 752], [414, 160, 414, 752],
  [12, 184, 25, 104], [25, 104, 68, 48], [68, 48, 138, 23],
  [138, 23, 268, 23], [268, 23, 349, 54], [349, 54, 394, 109],
  [394, 109, 414, 160], [373, 174, 373, 752],
  [379, 717, 414, 717],
  [30, 449, 47, 531], [47, 531, 94, 609],
  [359, 449, 346, 531], [346, 531, 300, 609],
  [64, 538, 99, 598], [330, 538, 295, 598],
];
export const BUMPERS = [
  { x: 197, y: 216, r: 28 },
  { x: 126, y: 280, r: 27 },
  { x: 267, y: 280, r: 27 },
] as const;
export const LANES = [{ x: 111, y: 119 }, { x: 197, y: 119 }, { x: 283, y: 119 }] as const;
export const TARGETS = [{ x: 144, y: 402 }, { x: 197, y: 414 }, { x: 250, y: 402 }] as const;
export const SLINGS: readonly (readonly Point[])[] = [
  [{ x: 63, y: 484 }, { x: 135, y: 562 }, { x: 83, y: 546 }],
  [{ x: 331, y: 484 }, { x: 259, y: 562 }, { x: 311, y: 546 }],
];
export interface ThemeConfig { bg: string; flipper: string; accent?: string; secondary?: string; }
export const THEMES: Record<string, ThemeConfig> = {
  space: { bg: '#081222', flipper: '#ffd575', accent: '#68e8f2', secondary: '#df83ff' },
  classic: { bg: '#101b32', flipper: '#ffcc65', accent: '#8fb9ff', secondary: '#ff8eaa' },
  forest: { bg: '#0b211e', flipper: '#e7cd79', accent: '#8de4b2', secondary: '#9dbaff' },
};
export const flipperCenter = (pivot: Point, angle: number): Point => ({
  x: pivot.x + Math.cos(angle) * FLIPPER_LENGTH / 2,
  y: pivot.y + Math.sin(angle) * FLIPPER_LENGTH / 2,
});
