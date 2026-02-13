import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WindowSwitcher from '../components/screen/window-switcher';

const WINDOWS = [
  { id: 'terminal', title: 'Terminal' },
  { id: 'files', title: 'Files' },
  { id: 'reports', title: 'Reports' },
];

describe('WindowSwitcher keyboard interactions', () => {
  it('wraps selection when cycling past the ends', async () => {
    const user = userEvent.setup();
    render(<WindowSwitcher windows={WINDOWS} />);

    const container = screen.getByRole('presentation');
    container.focus();

    const expectSelected = (name: string) => {
      const option = screen.getByRole('option', { name });
      expect(option).toHaveAttribute('aria-selected', 'true');
    };

    expectSelected('Terminal');

    await user.keyboard('{ArrowLeft}');
    expectSelected('Reports');

    await user.keyboard('{Tab}');
    expectSelected('Terminal');

    await user.keyboard('{Tab}');
    expectSelected('Files');

    await user.keyboard('{Tab}');
    expectSelected('Reports');

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expectSelected('Files');
  });

  it('activates search when typing and handles escape behaviour', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<WindowSwitcher windows={WINDOWS} onClose={onClose} />);

    const container = screen.getByRole('presentation');
    container.focus();

    await user.keyboard('r');

    const input = await screen.findByPlaceholderText('Filter windows');
    expect(input).toHaveValue('r');

    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');

    await user.keyboard('{Escape}');
    expect(screen.queryByPlaceholderText('Filter windows')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

