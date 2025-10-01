import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import QuickSettings from '../components/ui/QuickSettings';

jest.mock('../hooks/usePersistentState', () => ({
  __esModule: true,
  default: (key: string, initial: unknown) => {
    let value = typeof initial === 'function' ? (initial as () => unknown)() : initial;
    const setValue = (next: unknown) => {
      value =
        typeof next === 'function' ? (next as (prev: unknown) => unknown)(value) : next;
    };
    return [value, setValue] as const;
  },
}));

describe('QuickSettings focus management', () => {
  test('focuses the first control and traps tab navigation', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();

    render(<QuickSettings open={true} onClose={onClose} />);

    const themeButton = await screen.findByRole('button', { name: /Theme/i });
    const soundToggle = await screen.findByRole('checkbox', { name: 'Sound' });
    const networkToggle = await screen.findByRole('checkbox', { name: 'Network' });
    const reducedMotionToggle = await screen.findByRole('checkbox', { name: 'Reduced motion' });

    await waitFor(() => expect(themeButton).toHaveFocus());

    await user.tab();
    expect(soundToggle).toHaveFocus();

    await user.tab();
    expect(networkToggle).toHaveFocus();

    await user.tab();
    expect(reducedMotionToggle).toHaveFocus();

    await user.tab();
    expect(themeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(reducedMotionToggle).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('restores focus to the toggle button when closed with Escape', async () => {
    const user = userEvent.setup();

    function Wrapper() {
      const [open, setOpen] = React.useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)} data-testid="toggle">
            Toggle settings
          </button>
          <QuickSettings open={open} onClose={() => setOpen(false)} />
        </div>
      );
    }

    render(<Wrapper />);

    const toggle = screen.getByTestId('toggle');
    toggle.focus();
    await user.click(toggle);

    const themeButton = await screen.findByRole('button', { name: /Theme/i });
    await waitFor(() => expect(themeButton).toHaveFocus());

    await user.keyboard('{Escape}');

    await waitFor(() => expect(toggle).toHaveFocus());
  });
});
