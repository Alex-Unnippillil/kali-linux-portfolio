import { assetUrl } from '../../../utils/assetUrl';

export const BIRD_SKINS = ['yellow', 'red', 'blue'] as const;

export const BIRD_ANIMATION_FRAMES = BIRD_SKINS.map((name) =>
  Array.from({ length: 3 }, (_, frame) =>
    assetUrl(`/apps/flappy/skins/${name}-${frame}.svg`),
  )
);
export type RGB = [number, number, number];
export const PIPE_SKINS: [RGB, RGB][] = [
  [[34, 139, 34], [144, 238, 144]],
  [[139, 69, 19], [222, 184, 135]],
  [[70, 130, 180], [176, 196, 222]],
];
