import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useId, useState } from 'react';
import Overlay from '../components/ui/Overlay';

describe('Overlay', () => {
  function OverlayExample() {
    const [open, setOpen] = useState(false);
    const titleId = useId();
    const descriptionId = useId();

    return (
      <div>
        <button type="button" onClick={() => setOpen(true)}>
          Open overlay
        </button>
        <Overlay
          open={open}
          onOpenChange={setOpen}
          labelledBy={titleId}
          describedBy={descriptionId}
          className="rounded bg-gray-900 p-4 text-white"
        >
          <div className="space-y-2">
            <h2 id={titleId}>Example overlay</h2>
            <p id={descriptionId}>Overlay body content for testing.</p>
            <button type="button" onClick={() => setOpen(false)}>
              Close overlay
            </button>
          </div>
        </Overlay>
      </div>
    );
  }

  it('restores focus to the trigger when closed', async () => {
    const user = userEvent.setup();
    render(<OverlayExample />);

    const trigger = screen.getByRole('button', { name: 'Open overlay' });
    trigger.focus();

    await user.click(trigger);
    const closeButton = await screen.findByRole('button', { name: 'Close overlay' });
    await user.click(closeButton);

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('exposes labelled and described content for assistive tech', () => {
    const titleId = 'overlay-title';
    const descriptionId = 'overlay-description';

    render(
      <Overlay
        open
        onOpenChange={() => undefined}
        labelledBy={titleId}
        describedBy={descriptionId}
        className="rounded bg-gray-900 p-4 text-white"
      >
        <div>
          <h2 id={titleId}>Accessible overlay</h2>
          <p id={descriptionId}>Detailed description for screen readers.</p>
          <button type="button">Primary action</button>
        </div>
      </Overlay>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Accessible overlay' });
    expect(dialog).toHaveAttribute('aria-describedby', descriptionId);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });
});
