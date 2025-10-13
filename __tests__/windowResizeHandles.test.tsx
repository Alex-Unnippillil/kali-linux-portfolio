import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ResizeHandle } from '../components/base/window';

describe('Window resize handles', () => {
  beforeAll(() => {
    Element.prototype.setPointerCapture = jest.fn();
    Element.prototype.releasePointerCapture = jest.fn();
    Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(true);
  });

  it('renders directional metadata and cursor styles', () => {
    const ref = { current: document.createElement('div') };
    const { getByRole, unmount } = render(
      <ResizeHandle dir="se" windowRef={ref} onResizeStart={() => ({ left: 0, top: 0, width: 100, height: 100 })} />,
    );

    const handle = getByRole('presentation');
    expect(handle.dataset.resizeHandle).toBe('se');
    expect(handle.className).toContain('cursor-[nwse-resize]');

    unmount();
  });

  it('invokes callbacks during pointer interaction', () => {
    const ref = { current: document.createElement('div') };
    const start = jest.fn(() => ({ left: 10, top: 10, width: 120, height: 80 }));
    const move = jest.fn();
    const end = jest.fn();

    const { getByRole, unmount } = render(
      <ResizeHandle dir="nw" windowRef={ref} onResizeStart={start} onResizeMove={move} onResizeEnd={end} />,
    );

    const handle = getByRole('presentation');
    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 50, clientY: 75, pointerType: 'mouse', button: 0 });
    expect(start).toHaveBeenCalledWith('nw', expect.any(Object));

    fireEvent.pointerMove(handle, { pointerId: 1, clientX: 60, clientY: 90 });
    expect(move).toHaveBeenCalledWith('nw', expect.objectContaining({ startRect: expect.objectContaining({ width: 120, height: 80 }) }));

    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(end).toHaveBeenCalledWith('nw');

    unmount();
  });
});
