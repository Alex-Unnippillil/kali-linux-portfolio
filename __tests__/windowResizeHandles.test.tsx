import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { WindowResizeHandles } from '../components/base/window';

describe('Window resize handles', () => {
  it('renders eight handles covering each direction', () => {
    const { container, unmount } = render(<WindowResizeHandles onResizeStart={jest.fn()} />);
    const handles = Array.from(container.querySelectorAll('[data-direction]'));

    expect(handles).toHaveLength(8);
    expect(handles.map((el) => el.getAttribute('data-direction')).sort()).toEqual([
      'e',
      'n',
      'ne',
      'nw',
      's',
      'se',
      'sw',
      'w',
    ]);

    unmount();
  });

  it('invokes the resize start callback on pointer interaction', () => {
    const onResizeStart = jest.fn();
    const { container, unmount } = render(<WindowResizeHandles onResizeStart={onResizeStart} />);
    const handle = container.querySelector('[data-direction="se"]') as HTMLElement;

    fireEvent.pointerDown(handle, { pointerType: 'mouse', button: 0 });

    expect(onResizeStart).toHaveBeenCalledWith('se', expect.objectContaining({ type: 'pointerdown' }));

    unmount();
  });
});
