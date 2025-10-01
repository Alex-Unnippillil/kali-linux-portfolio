import { jest } from '@jest/globals';

describe('chaos state', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  it('toggles faults in dev mode', async () => {
    process.env.NODE_ENV = 'test';
    jest.resetModules();
    const chaos = (await import('../lib/dev/chaosState')).default;
    expect(chaos.isEnabled('terminal', 'timeout')).toBe(false);
    chaos.setFault('terminal', 'timeout', true);
    expect(chaos.isEnabled('terminal', 'timeout')).toBe(true);
    chaos.resetApp('terminal');
    expect(chaos.isEnabled('terminal', 'timeout')).toBe(false);
  });

  it('is a no-op in production builds', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const chaos = (await import('../lib/dev/chaosState')).default;
    expect(chaos.isDev).toBe(false);
    chaos.setFault('terminal', 'timeout', true);
    expect(chaos.isEnabled('terminal', 'timeout')).toBe(false);
  });
});
