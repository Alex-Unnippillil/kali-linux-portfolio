import { Desktop } from '../components/screen/desktop';

describe('window state persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { writable: true, value: 600 });
  });

  test('restores clamped bounds and z-order', () => {
    window.localStorage.setItem(
      'window-states',
      JSON.stringify({
        second: { x: 1000, y: -50, width: 60, height: 80, z: 2 },
        first: { x: 10, y: 20, width: 40, height: 50, z: 1 },
      })
    );

    const desk = new Desktop();
    // mock setState to apply updates synchronously
    // @ts-ignore
    desk.setState = (update: any, cb?: () => void) => {
      const u = typeof update === 'function' ? update(desk.state) : update;
      desk.state = { ...desk.state, ...u };
      cb && cb();
    };
    const opened: string[] = [];
    jest.spyOn(desk, 'openApp').mockImplementation((id: string) => {
      opened.push(id);
    });

    const restored = desk.restoreWindowStates();
    expect(restored).toBe(true);
    expect(opened).toEqual(['first', 'second']);
    const state = desk.state.window_positions['second'];
    expect(state.x).toBe(800 - 0.6 * 800); // clamped to viewport
    expect(state.y).toBe(0); // negative y clamped to 0
  });
});

