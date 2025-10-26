import {
  computeFrameIndex,
  formatKeyCombo,
  sanitizeIgnoreList,
  shouldIgnoreKey,
  shouldRecordEvent,
} from '../utils/overlay';

const mockEvent = (overrides: Partial<KeyboardEvent> = {}) =>
  ({
    key: 'a',
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    ...overrides,
  }) as KeyboardEvent;

describe('overlay utilities', () => {
  it('formats key combos with consistent ordering', () => {
    const combo = formatKeyCombo(
      mockEvent({ key: 's', ctrlKey: true, altKey: true, shiftKey: true }),
    );
    expect(combo).toEqual(['Ctrl', 'Alt', 'Shift', 'S']);
  });

  it('computes frame index relative to recording start', () => {
    const start = 1000;
    const now = start + 166;
    expect(computeFrameIndex(now, start, 60)).toBe(10);
  });

  it('prevents noisy duplicates within threshold', () => {
    const map = new Map<string, number>();
    const threshold = 200;
    const first = shouldRecordEvent('Ctrl + S', 1000, threshold, map);
    const second = shouldRecordEvent('Ctrl + S', 1100, threshold, map);
    const third = shouldRecordEvent('Ctrl + S', 1400, threshold, map);
    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(third).toBe(true);
  });

  it('sanitises ignore lists case-insensitively', () => {
    const list = sanitizeIgnoreList(['Meta', ' meta ', 'Shift']);
    expect(list).toEqual(['meta', 'shift']);
  });

  it('matches ignored keys regardless of case', () => {
    const ignore = new Set(['meta', 'shift']);
    expect(shouldIgnoreKey('Meta', ignore)).toBe(true);
    expect(shouldIgnoreKey('Shift', ignore)).toBe(true);
    expect(shouldIgnoreKey('Alt', ignore)).toBe(false);
  });
});
