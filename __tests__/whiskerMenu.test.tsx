import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import WhiskerMenu from '../components/menu/WhiskerMenu';

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    // @ts-expect-error - assigning to allow the component to schedule animations in tests
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const getNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
      return window.setTimeout(() => callback(getNow()), 0);
    };
  }
});

describe('WhiskerMenu keyboard shortcuts', () => {
  it('opens the menu when the Alt+F1 fallback shortcut is pressed', () => {
    render(<WhiskerMenu />);

    expect(screen.queryByText('Categories')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'F1', altKey: true });

    expect(screen.getByText('Categories')).toBeInTheDocument();
  });
});
