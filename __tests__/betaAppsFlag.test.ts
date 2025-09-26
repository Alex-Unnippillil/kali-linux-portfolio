describe('beta flag app gating', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SHOW_BETA;
  });

  test('hides beta apps when flag is disabled', async () => {
    delete process.env.NEXT_PUBLIC_SHOW_BETA;
    jest.resetModules();
    const mod = await import('../apps.config');
    const betaApp = mod.default.find((app) => app.id === 'plugin-manager');
    expect(betaApp).toBeUndefined();
  });

  test('exposes beta apps when flag is enabled', async () => {
    process.env.NEXT_PUBLIC_SHOW_BETA = '1';
    jest.resetModules();
    const mod = await import('../apps.config');
    const betaApp = mod.default.find((app) => app.id === 'plugin-manager');
    expect(betaApp).toBeDefined();
    expect(betaApp?.beta).toBe(true);
  });
});
