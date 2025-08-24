import { ModeController, DEFAULT_MODE_SCHEDULE } from '@apps/pacman/modes';

describe('ghost mode transitions', () => {
  test('follows default schedule', () => {
    const mc = new ModeController();
    // initial scatter for 7 seconds
    for (let i = 0; i < 7 * 60; i++) mc.tick();
    expect(mc.currentMode()).toBe('scatter');
    mc.tick();
    expect(mc.currentMode()).toBe('chase');
    // next chase lasts 20s
    for (let i = 0; i < 20 * 60; i++) mc.tick();
    expect(mc.currentMode()).toBe('chase');
    mc.tick();
    expect(mc.currentMode()).toBe('scatter');
  });
});

