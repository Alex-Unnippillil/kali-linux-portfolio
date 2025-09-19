import { runSelfTest, type SelfTestResult } from '../lib/selfTest';

describe('runSelfTest', () => {
  it('returns a passing result with timing data', async () => {
    let tick = 0;
    const now = () => {
      tick += 5;
      return tick;
    };
    const openCatalog = jest.fn();
    const launchApp = jest.fn();
    const closeApp = jest.fn();

    const result = await runSelfTest({
      now,
      candidateApps: ['calculator'],
      openCatalog,
      launchApp,
      closeApp,
    });

    expect(openCatalog).toHaveBeenCalled();
    expect(launchApp).toHaveBeenCalled();
    expect(closeApp).toHaveBeenCalled();
    expect(result.status).toBe('pass');
    expect(result.steps).toHaveLength(4);
    result.steps.forEach((step) => {
      expect(step.status).toBe('pass');
      expect(typeof step.durationMs).toBe('number');
    });
  });

  it('skips heavy apps when safe mode is active', async () => {
    let tick = 0;
    const now = () => {
      tick += 10;
      return tick;
    };
    const launchApp = jest.fn();

    const result: SelfTestResult = await runSelfTest({
      safeMode: true,
      now,
      candidateApps: ['terminal', 'calculator'],
      heavyApps: ['terminal'],
      openCatalog: jest.fn(),
      launchApp,
      closeApp: jest.fn(),
    });

    expect(result.appId.toLowerCase()).toBe('calculator');
    expect(launchApp).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.stringMatching(/calculator/i) }),
    );
    expect(result.status).toBe('pass');
  });
});
