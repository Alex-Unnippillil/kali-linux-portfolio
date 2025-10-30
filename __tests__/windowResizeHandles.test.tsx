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

  it('keeps resize handles out of the tab order', () => {
    const { container, rerender, unmount } = render(
      <WindowEdgeHandle direction="s" onResizeStart={jest.fn()} active={false} />,
    );

    const edgeHandle = container.firstElementChild as HTMLElement;
    expect(edgeHandle).toHaveAttribute('aria-hidden', 'true');
    expect(edgeHandle).toHaveAttribute('tabindex', '-1');
    expect(edgeHandle.getAttribute('role')).toBe('presentation');

    rerender(
      <WindowCornerHandle direction="nw" onResizeStart={jest.fn()} active={false} />,
    );

    const cornerHandle = container.firstElementChild as HTMLElement;
    expect(cornerHandle).toHaveAttribute('aria-hidden', 'true');
    expect(cornerHandle).toHaveAttribute('tabindex', '-1');
    expect(cornerHandle.getAttribute('role')).toBe('presentation');

    unmount();
  });

  it('does not steal focus from already focused controls', () => {
    const resizeStart = jest.fn();
    const { getByRole, container, unmount } = render(
      <>
        <button type="button">Focusable control</button>
        <WindowEdgeHandle direction="e" onResizeStart={resizeStart} active={false} />
      </>,
    );

    const button = getByRole('button', { name: 'Focusable control' }) as HTMLButtonElement;
    button.focus();
    expect(document.activeElement).toBe(button);

    const handle = container.lastElementChild as HTMLElement;
    fireEvent.pointerDown(handle, { clientX: 360, clientY: 120, pointerId: 8 });

    expect(resizeStart).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(button);

    unmount();
  });
});
