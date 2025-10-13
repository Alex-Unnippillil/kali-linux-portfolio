import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WindowEditButtons } from '../../components/base/window';

describe('Window control buttons', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it('responds to keyboard activation for minimize and close actions', async () => {
    const minimize = jest.fn();
    const maximize = jest.fn();
    const close = jest.fn();

    render(
      <WindowEditButtons
        minimize={minimize}
        maximize={maximize}
        isMaximised={false}
        close={close}
        id="example"
        allowMaximize
      />
    );

    const user = userEvent.setup();
    const minimizeButton = screen.getByRole('button', { name: /window minimize/i });
    const maximizeButton = screen.getByRole('button', { name: /window maximize/i });
    const closeButton = screen.getByRole('button', { name: /window close/i });

    await user.tab();
    expect(minimizeButton).toHaveFocus();
    await user.type(minimizeButton, '{enter}');
    expect(minimize).toHaveBeenCalled();

    await user.tab();
    expect(maximizeButton).toHaveFocus();
    await user.type(maximizeButton, ' ');
    expect(maximize).toHaveBeenCalled();

    await user.tab();
    expect(closeButton).toHaveFocus();
    close.mockClear();
    await user.type(closeButton, '{enter}');
    expect(close).toHaveBeenCalled();
  });
});
