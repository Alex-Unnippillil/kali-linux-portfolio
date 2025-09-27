import { cursorForHandle, getResizeHandle, ResizeHitSlopConfig } from '../components/base/resizeUtils';

const createRect = (left: number, top: number, width: number, height: number): DOMRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
  x: left,
  y: top,
  toJSON: () => ({ left, top, width, height }),
} as DOMRect);

const config: ResizeHitSlopConfig = { edge: 16, corner: 24 };

describe('getResizeHandle', () => {
  const rect = createRect(100, 100, 200, 200);

  it('detects west edge when pointer is inside hit slop', () => {
    const handle = getResizeHandle(rect, { x: 104, y: 180 }, config);
    expect(handle).toBe('w');
  });

  it('detects east edge when pointer is just outside the frame', () => {
    const handle = getResizeHandle(rect, { x: 308, y: 210 }, config);
    expect(handle).toBe('e');
  });

  it('prefers diagonal handles when inside a corner zone', () => {
    const handle = getResizeHandle(rect, { x: 102, y: 102 }, config);
    expect(handle).toBe('nw');
  });

  it('supports south-east corner hit testing', () => {
    const handle = getResizeHandle(rect, { x: 296, y: 296 }, config);
    expect(handle).toBe('se');
  });

  it('returns null when pointer is away from edges', () => {
    const handle = getResizeHandle(rect, { x: 200, y: 200 }, config);
    expect(handle).toBeNull();
  });

  it('maps handles to CSS cursors', () => {
    expect(cursorForHandle('n')).toBe('ns-resize');
    expect(cursorForHandle('se')).toBe('nwse-resize');
    expect(cursorForHandle(null)).toBeNull();
  });
});
