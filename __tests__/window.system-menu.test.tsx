import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Window from '../components/base/window';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const defaultProps = {
  id: 'system-menu-window',
  title: 'System Menu Test',
  screen: () => <div>content</div>,
  focus: () => {},
  hasMinimised: () => {},
  closed: jest.fn(),
  openApp: () => {},
};

describe('Window system menu', () => {
  beforeEach(() => {
    defaultProps.closed.mockClear();
  });

  it('opens the system menu with Alt+Space', () => {
    render(<Window {...defaultProps} />);

    const windowNode = screen.getByRole('dialog');
    windowNode.focus();

    fireEvent.keyDown(windowNode, { key: ' ', code: 'Space', altKey: true });

    const menu = screen.getByTestId('window-system-menu');
    expect(menu).toHaveAttribute('aria-hidden', 'false');
  });

  it('closes the system menu with Escape without closing the window', async () => {
    render(<Window {...defaultProps} />);

    const windowNode = screen.getByRole('dialog');
    windowNode.focus();

    fireEvent.keyDown(windowNode, { key: ' ', code: 'Space', altKey: true });
    const menu = screen.getByTestId('window-system-menu');
    expect(menu).toHaveAttribute('aria-hidden', 'false');

    fireEvent.keyDown(windowNode, { key: 'Escape' });

    await waitFor(() => expect(menu).toHaveAttribute('aria-hidden', 'true'));
    expect(defaultProps.closed).not.toHaveBeenCalled();
  });
});
