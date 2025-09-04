export interface Features {
  gamepadHaptics: boolean;
}

export const features: Features = {
  gamepadHaptics: true,
};

if (typeof globalThis !== 'undefined') {
  (globalThis as any).features = {
    ...(globalThis as any).features,
    ...features,
  } as Features;
}

export default features;
