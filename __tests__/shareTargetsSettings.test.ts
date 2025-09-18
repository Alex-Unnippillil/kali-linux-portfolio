describe('share target settings persistence', () => {
  const modulePath = '../utils/settings/shareTargets';

  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
    localStorage.clear();
  });

  it('persists custom ordering across sessions', async () => {
    const first = await import(modulePath);
    const initial = first
      .getShareTargetsForManagement()
      .map((target) => target.id);
    const rotated = [...initial.slice(1), initial[0]];
    first.reorderShareTargets(rotated);

    jest.resetModules();
    const second = await import(modulePath);
    const after = second
      .getShareTargetsForManagement()
      .map((target) => target.id);
    expect(after).toEqual(rotated);
  });
});
