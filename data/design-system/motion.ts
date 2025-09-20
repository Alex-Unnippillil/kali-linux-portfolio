export const motionDurations = {
  instant: 0,
  micro: 50,
  brisk: 100,
  interaction: 150,
  reveal: 200,
  settle: 240,
  window: 300,
  modal: 400,
  idle: 1000,
  linger: 3000,
} as const;

export type MotionDurationToken = keyof typeof motionDurations;

export const motionEasings = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  linear: 'linear',
} as const;

export type MotionEasingToken = keyof typeof motionEasings;

export interface MotionPresetDefinition {
  properties: string[];
  duration: MotionDurationToken;
  easing: MotionEasingToken;
  delay?: MotionDurationToken | number;
}

const presetMap = {
  shellInteractive: {
    properties: ['background-color', 'border-color', 'box-shadow', 'transform'],
    duration: 'interaction',
    easing: 'standard',
  },
  shellOverlay: {
    properties: ['opacity'],
    duration: 'reveal',
    easing: 'decelerate',
  },
  shellWindow: {
    properties: ['opacity', 'transform', 'box-shadow'],
    duration: 'window',
    easing: 'emphasized',
  },
  shellScale: {
    properties: ['transform'],
    duration: 'reveal',
    easing: 'emphasized',
  },
  systemInertia: {
    properties: ['all'],
    duration: 'brisk',
    easing: 'standard',
  },
} satisfies Record<string, MotionPresetDefinition>;

export const motionPresets = presetMap;

export type MotionPresetToken = keyof typeof motionPresets;
