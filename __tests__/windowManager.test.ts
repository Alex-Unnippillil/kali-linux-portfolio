import WindowManager from '../utils/windowManager';

describe('WindowManager z-order', () => {
  it('assigns increasing z-index as windows are registered', () => {
    const wm = new WindowManager(10);
    wm.register('a');
    wm.register('b');
    wm.register('c');
    expect(wm.getZIndex('a')).toBe(10);
    expect(wm.getZIndex('b')).toBe(11);
    expect(wm.getZIndex('c')).toBe(12);
  });

  it('moves focused window to top and maintains stack', () => {
    const wm = new WindowManager(5);
    wm.register('w1');
    wm.register('w2');
    wm.register('w3');
    expect(wm.getOrder()).toEqual(['w1', 'w2', 'w3']);
    wm.focus('w2');
    expect(wm.getOrder()).toEqual(['w1', 'w3', 'w2']);
    expect(wm.getZIndex('w2')).toBe(7); // 5 base + index 2
    wm.focus('w1');
    expect(wm.getOrder()).toEqual(['w3', 'w2', 'w1']);
    expect(wm.getZIndex('w1')).toBe(7);
  });
});
