
describe('exo-open helper preferences', () => {
  const STORAGE_KEY = 'xfce-helpers';

  beforeEach(() => {
    localStorage.clear();
    jest.resetModules();
  });

  it('reads defaults and persists selections', async () => {
    const exo = await import('../src/lib/exo-open');
    const { getPreferredApp, setPreferredApp } = exo;

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    const def = await getPreferredApp('TerminalEmulator');
    expect(def).toBe('terminal');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    await setPreferredApp('TerminalEmulator', 'serial-terminal');
    const updated = await getPreferredApp('TerminalEmulator');
    expect(updated).toBe('serial-terminal');

    const saved = localStorage.getItem(STORAGE_KEY);
    expect(saved).toContain('"TerminalEmulator":"serial-terminal"');
  });
});
