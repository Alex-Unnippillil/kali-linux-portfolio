import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { WindowEdgeHandle, WindowCornerHandle } from '../components/base/window';

describe('Window resize handles', () => {
  it('exposes metadata for edge handles', () => {
    const { container, unmount } = render(
      <WindowEdgeHandle direction="n" onResizeStart={jest.fn()} active={false} />,
    );

    const handle = container.firstElementChild as HTMLElement;

    expect(handle).toHaveAttribute('data-resize-handle', 'edge');
    expect(handle).toHaveAttribute('data-resize-direction', 'n');

    unmount();
  });

  it('triggers onResizeStart when an edge handle is pressed', () => {
    const resizeStart = jest.fn();
    const { container, unmount } = render(
      <WindowEdgeHandle direction="e" onResizeStart={resizeStart} active />,
    );

    const handle = container.firstElementChild as HTMLElement;
    fireEvent.pointerDown(handle, { clientX: 120, clientY: 64, pointerId: 1 });

    expect(resizeStart).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('triggers onResizeStart when a corner handle is pressed', () => {
    const resizeStart = jest.fn();
    const { container, unmount } = render(
      <WindowCornerHandle direction="se" onResizeStart={resizeStart} active={false} />,
    );

    const handle = container.firstElementChild as HTMLElement;
    fireEvent.pointerDown(handle, { clientX: 420, clientY: 360, pointerId: 4 });

    expect(resizeStart).toHaveBeenCalledTimes(1);

    unmount();
  });
});
