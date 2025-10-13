import React from 'react';
import { render } from '@testing-library/react';
import { WindowYBorder, WindowXBorder } from '../components/base/window';

describe('Window resize handles', () => {
  it('marks the vertical resize handle as draggable', () => {
    const { container, unmount } = render(<WindowYBorder resize={jest.fn()} />);
    const handle = container.firstChild as HTMLElement;

    expect(handle).toHaveAttribute('draggable', 'true');

    unmount();
  });

  it('marks the horizontal resize handle as draggable', () => {
    const { container, unmount } = render(<WindowXBorder resize={jest.fn()} />);
    const handle = container.firstChild as HTMLElement;

    expect(handle).toHaveAttribute('draggable', 'true');

    unmount();
  });
});
