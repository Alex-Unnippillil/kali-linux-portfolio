import { hasOffscreenCanvas } from '../../utils/feature';

export const canUseOffscreenRendering = (): boolean =>
  typeof window !== 'undefined' && typeof Worker === 'function' && hasOffscreenCanvas();
