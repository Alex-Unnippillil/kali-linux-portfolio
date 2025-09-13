import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dock from '../components/dock/Dock';

describe('Dock visibility controls', () => {
  test('reveals on Super+B', () => {
    const { container, unmount } = render(<Dock />);
    const nav = container.querySelector('nav');
    expect(nav).toBeTruthy();
    expect(nav).toHaveClass('-translate-x-full');
    fireEvent.keyDown(window, { key: 'b', metaKey: true });
    expect(nav).toHaveClass('translate-x-0');
    unmount();
  });

  test('reveals when pointer near edge', () => {
    const { container, unmount } = render(<Dock />);
    const nav = container.querySelector('nav');
    fireEvent.mouseMove(window, { clientX: 0 });
    expect(nav).toHaveClass('translate-x-0');
    unmount();
  });
});
