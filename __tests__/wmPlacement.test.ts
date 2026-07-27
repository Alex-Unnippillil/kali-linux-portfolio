import { repositionWindowsForKeyboard, KEYBOARD_AVOIDANCE_MARGIN, type SoftKeyboardFrameDetail, type WindowPlacement } from '@/src/wm/placement';

describe('repositionWindowsForKeyboard', () => {
  const viewport = { width: 1280, height: 800 };

  it('returns the same positions when keyboard is absent', () => {
    const windows: WindowPlacement[] = [
      { id: 'a', x: 120, y: 80, width: 320, height: 240 },
      { id: 'b', x: 640, y: 160, width: 320, height: 240 },
    ];

    const result = repositionWindowsForKeyboard(windows, null, viewport);

    expect(result).toEqual(windows);
  });

  it('moves overlapping windows above a docked keyboard', () => {
    const windows: WindowPlacement[] = [
      { id: 'chat', x: 200, y: 520, width: 480, height: 260 },
    ];

    const keyboard: SoftKeyboardFrameDetail = {
      mode: 'docked',
      rect: {
        x: 0,
        y: 600,
        width: viewport.width,
        height: 200,
        top: 600,
        left: 0,
        right: viewport.width,
        bottom: 800,
      },
    };

    const [adjusted] = repositionWindowsForKeyboard(windows, keyboard, viewport);

    expect(adjusted.y).toBeLessThan(windows[0].y);
    expect(adjusted.y + adjusted.height).toBeLessThanOrEqual(
      keyboard.rect.top - Math.max(0, KEYBOARD_AVOIDANCE_MARGIN - 0.5)
    );
  });

  it('prefers lateral movement for floating keyboards', () => {
    const windows: WindowPlacement[] = [
      { id: 'notes', x: 520, y: 360, width: 320, height: 220 },
    ];

    const keyboard: SoftKeyboardFrameDetail = {
      mode: 'floating',
      rect: {
        x: 540,
        y: 340,
        width: 300,
        height: 240,
        left: 540,
        top: 340,
        right: 840,
        bottom: 580,
      },
    };

    const [adjusted] = repositionWindowsForKeyboard(windows, keyboard, viewport);

    expect(adjusted.y).toBeCloseTo(windows[0].y, 1);
    const clearedHorizontally =
      adjusted.x + adjusted.width <= keyboard.rect.left - (KEYBOARD_AVOIDANCE_MARGIN - 0.5) ||
      adjusted.x >= keyboard.rect.right + (KEYBOARD_AVOIDANCE_MARGIN - 0.5);
    expect(clearedHorizontally).toBe(true);
  });
});
