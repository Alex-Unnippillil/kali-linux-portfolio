import { windowStore } from '../utils/windowStore';

describe('windowStore', () => {
  afterEach(() => {
    windowStore.reset();
  });

  it('orders windows by most recent focus', () => {
    windowStore.registerWindow({ id: 'one', title: 'One', minimized: false, closed: false });
    windowStore.registerWindow({ id: 'two', title: 'Two', minimized: false, closed: false });
    windowStore.registerWindow({ id: 'three', title: 'Three', minimized: false, closed: false });

    windowStore.focusWindow('one');
    windowStore.focusWindow('three');
    windowStore.focusWindow('two');

    expect(windowStore.getWindows().map((entry) => entry.id)).toEqual([
      'two',
      'three',
      'one',
    ]);
  });

  it('cycles focus while skipping minimized windows', () => {
    windowStore.registerWindow({ id: 'alpha', title: 'Alpha', minimized: false, closed: false });
    windowStore.registerWindow({ id: 'beta', title: 'Beta', minimized: false, closed: false });
    windowStore.registerWindow({ id: 'gamma', title: 'Gamma', minimized: false, closed: false });
    windowStore.focusWindow('alpha');

    windowStore.setMinimized('beta', true);

    expect(windowStore.cycleFocus(1, 'alpha')).toBe('gamma');
    expect(windowStore.cycleFocus(-1, 'alpha')).toBe('gamma');
  });
});
