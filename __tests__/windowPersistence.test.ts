import { readWindowState, writeWindowState, readAllWindowStates } from '../utils/windowPersistence';

beforeEach(() => {
  localStorage.clear();
});

describe('window persistence utility', () => {
  it('merges partial updates into stored state', () => {
    writeWindowState('about', { x: 12.5, y: 8.25 });
    expect(readWindowState('about')).toEqual({
      x: 12.5,
      y: 8.25,
      width: 60,
      height: 85,
      maximized: false,
    });

    writeWindowState('about', { width: 72, height: 64, maximized: true });
    expect(readWindowState('about')).toEqual({
      x: 12.5,
      y: 8.25,
      width: 72,
      height: 64,
      maximized: true,
    });
  });

  it('cleans up invalid stored data', () => {
    localStorage.setItem('wm:broken', '"not-json"');
    expect(readWindowState('broken')).toBeNull();
    expect(localStorage.getItem('wm:broken')).toBeNull();

    localStorage.setItem('wm:bad-shape', JSON.stringify({ x: 'left', y: 10 }));
    expect(readWindowState('bad-shape')).toBeNull();
    expect(localStorage.getItem('wm:bad-shape')).toBeNull();
  });

  it('returns all sanitized window states', () => {
    writeWindowState('app-one', { x: 1, y: 2, width: 80, height: 70 });
    writeWindowState('app-two', { x: 4, y: 6, maximized: true });

    expect(readAllWindowStates()).toEqual({
      'app-one': { x: 1, y: 2, width: 80, height: 70, maximized: false },
      'app-two': { x: 4, y: 6, width: 60, height: 85, maximized: true },
    });
  });
});
