import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { SideBarApp } from '../components/base/side_bar_app';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt ?? ''} />,
}));

const originalMatchMedia = window.matchMedia;

const createMatchMedia = (matches: boolean) => {
  return jest.fn().mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  });
};

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('SideBarApp motion handling', () => {
  it('skips launch animation when reduced motion is preferred', () => {
    window.matchMedia = createMatchMedia(true) as unknown as typeof window.matchMedia;
    const timeoutSpy = jest.spyOn(window, 'setTimeout');

    try {
      const { getByRole, container } = render(
        <SideBarApp
          id="terminal"
          title="Terminal"
          icon="/terminal.png"
          isClose={{ terminal: true }}
          isFocus={{ terminal: false }}
          isMinimized={{ terminal: false }}
          notifications={[]}
          tasks={[]}
          openApp={jest.fn()}
        />
      );

      const button = getByRole('button', { name: 'Terminal' });
      fireEvent.click(button);

      const scaled = container.querySelector('.scalable-app-icon');
      expect(scaled).not.toHaveClass('scale');
      expect(timeoutSpy).not.toHaveBeenCalled();
    } finally {
      timeoutSpy.mockRestore();
    }
  });
});
