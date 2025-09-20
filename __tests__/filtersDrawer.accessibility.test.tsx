import React, { useRef, useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FiltersDrawer from '../apps/nessus/components/FiltersDrawer';

const severityFilters = {
  Critical: true,
  High: true,
  Medium: true,
  Low: true,
  Info: true,
};

const tags = ['web', 'db'];

describe('FiltersDrawer accessibility', () => {
  it('traps focus and returns it to the trigger on close', async () => {
    const user = userEvent.setup();
    const onCloseSpy = jest.fn();

    const Wrapper = () => {
      const [open, setOpen] = useState(true);
      const triggerRef = useRef<HTMLButtonElement>(null);

      const handleClose = () => {
        setOpen(false);
        onCloseSpy();
      };

      return (
        <div>
          <button ref={triggerRef} type="button">
            Filters
          </button>
          <FiltersDrawer
            id="test-filters-drawer"
            open={open}
            onClose={handleClose}
            severityFilters={severityFilters}
            toggleSeverity={jest.fn()}
            tags={tags}
            tagFilters={[]}
            toggleTag={jest.fn()}
            returnFocusRef={triggerRef}
          />
        </div>
      );
    };

    render(<Wrapper />);

    const firstCheckbox = await screen.findByRole('checkbox', { name: /critical/i });
    await waitFor(() => expect(firstCheckbox).toHaveFocus());

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: /db/i })).toHaveFocus();

    await user.keyboard('{Tab}');
    await waitFor(() => expect(firstCheckbox).toHaveFocus());

    await user.keyboard('{Escape}');
    await waitFor(() => expect(onCloseSpy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: /filters/i })).toHaveFocus());
  });
});
