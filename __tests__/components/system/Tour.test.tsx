import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tour, { TourStep } from '@/components/system/Tour';

describe('Tour', () => {
  const steps: TourStep[] = [
    {
      id: 'welcome',
      title: 'Welcome',
      description: <p>Intro content</p>,
    },
    {
      id: 'dock',
      title: 'Dock',
      description: <p>Dock details</p>,
    },
    {
      id: 'workspaces',
      title: 'Workspaces',
      description: <p>Workspace details</p>,
    },
  ];

  it('restores focus to the trigger after closing', async () => {
    const TourHarness = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Launch tour
          </button>
          <Tour
            open={open}
            onClose={() => setOpen(false)}
            steps={steps}
            title="System tour"
          />
        </div>
      );
    };

    const user = userEvent.setup();
    render(<TourHarness />);

    const trigger = screen.getByRole('button', { name: /launch tour/i });
    trigger.focus();
    await user.click(trigger);

    expect(await screen.findByRole('dialog', { name: /system tour/i })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /system tour/i })).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  it('keeps all controls reachable via tab order', async () => {
    const user = userEvent.setup();
    render(<Tour open onClose={() => {}} steps={steps} title="System tour" />);

    const closeButton = await screen.findByRole('button', { name: /close tour/i });
    const stepButtons = screen.getAllByRole('button', { name: /step \d/i });
    const nextButton = screen.getByRole('button', { name: /next step/i });

    const expectedElements = [closeButton, ...stepButtons, nextButton];
    const visited = new Set<HTMLElement>();

    for (let i = 0; i < expectedElements.length * 3 && visited.size < expectedElements.length; i += 1) {
      await user.tab();
      const active = document.activeElement as HTMLElement | null;
      if (!active) continue;
      expectedElements.forEach((element) => {
        if (element === active) {
          visited.add(element);
        }
      });
    }

    expect(visited.size).toBe(expectedElements.length);

    await user.tab();
    expect(expectedElements).toContain(document.activeElement);
  });

  it('advances through steps and finishes with keyboard interaction', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<Tour open onClose={onClose} steps={steps} title="System tour" />);

    const nextButton = await screen.findByRole('button', { name: /next step/i });
    await user.click(nextButton);
    expect(screen.getByText(/dock details/i)).toBeInTheDocument();

    await user.click(nextButton);
    const finishButton = screen.getByRole('button', { name: /finish tour/i });
    await user.click(finishButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
