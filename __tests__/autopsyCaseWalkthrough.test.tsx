import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CaseWalkthrough from '../apps/autopsy/components/CaseWalkthrough';

describe('CaseWalkthrough carousel', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('moves focus with arrow keys', async () => {
    const user = userEvent.setup();
    render(<CaseWalkthrough />);

    const firstSlide = screen.getByRole('button', {
      name: /Event 1 of/i,
    });

    firstSlide.focus();
    expect(firstSlide).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    const secondSlide = screen.getByRole('button', {
      name: /Event 2 of/i,
    });
    await waitFor(() => expect(secondSlide).toHaveFocus());

    await user.keyboard('{ArrowLeft}');
    await waitFor(() => expect(firstSlide).toHaveFocus());
  });

  it('persists annotations between mounts', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<CaseWalkthrough />);

    const notesField = screen.getByLabelText(/Investigator notes/i) as HTMLTextAreaElement;
    await user.clear(notesField);
    await user.type(notesField, 'Important lead');

    await waitFor(() => {
      const stored = window.localStorage.getItem('autopsy-case-annotations');
      expect(stored).toContain('Important lead');
    });

    unmount();

    render(<CaseWalkthrough />);
    const restoredField = screen.getByLabelText(/Investigator notes/i) as HTMLTextAreaElement;

    expect(restoredField.value).toBe('Important lead');
  });
});

