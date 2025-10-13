import { registerHydraProtocol } from '@/components/apps/hydra';

describe('registerHydraProtocol', () => {
  it('does not throw when window is undefined', () => {
    const originalWindow = global.window;

    try {
      global.window = undefined;

      expect(() => registerHydraProtocol('custom-service')).not.toThrow();
    } finally {
      global.window = originalWindow;
    }
  });
});
