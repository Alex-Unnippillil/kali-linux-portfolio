export const BIRD_SKINS = ['yellow', 'red', 'blue'] as const;
export const BIRD_ASSETS = BIRD_SKINS.map(
  (name) => `/apps/flappy/skins/${name}.svg`
);
export type RGB = [number, number, number];
export const PIPE_SKINS: [RGB, RGB][] = [
  [[34, 139, 34], [144, 238, 144]],
  [[139, 69, 19], [222, 184, 135]],
  [[70, 130, 180], [176, 196, 222]],
];
