import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import ChangelogModal, {
  CHANGELOG_STORAGE_KEY,
  LATEST_CHANGELOG_VERSION,
} from '../components/common/ChangelogModal';

describe('ChangelogModal', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('opens automatically for a new version and persists dismissal on close', async () => {
    render(<ChangelogModal />);

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(window.localStorage.getItem(CHANGELOG_STORAGE_KEY)).toBe(
      LATEST_CHANGELOG_VERSION
    );
  });

  it('does not reopen automatically when the current version is dismissed', async () => {
    if (LATEST_CHANGELOG_VERSION) {
      window.localStorage.setItem(
        CHANGELOG_STORAGE_KEY,
        LATEST_CHANGELOG_VERSION
      );
    }

    render(<ChangelogModal />);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('focuses the close button when the modal opens', async () => {
    render(<ChangelogModal />);

    const closeButton = await screen.findByRole('button', { name: /close/i });

    await waitFor(() => {
      expect(document.activeElement).toBe(closeButton);
    });
  });

  it('renders markdown content from the changelog', async () => {
    render(<ChangelogModal />);

    const changelogContainer = await screen.findByTestId('changelog-markdown');

    expect(changelogContainer).toHaveTextContent('Added safe copy script');
    expect(
      screen.getByRole('heading', { name: /\[2\.1\.0\] - 2025-09-03/ })
    ).toBeInTheDocument();
  });

  it("supports a custom trigger and exposes the new-version indicator", async () => {
    render(
      <ChangelogModal
        trigger={({ open, hasNew }) => (
          <button type="button" data-has-new={hasNew} onClick={open}>
            Launch changelog
          </button>
        )}
      />
    );

    const trigger = screen.getByRole('button', { name: /launch changelog/i });
    expect(trigger).toHaveAttribute('data-has-new', 'true');

    await act(async () => {
      fireEvent.click(trigger);
    });

    const dismiss = await screen.findByRole('button', {
      name: /don't show for this version/i,
    });
    fireEvent.click(dismiss);

    expect(trigger).toHaveAttribute('data-has-new', 'false');
  });
});

