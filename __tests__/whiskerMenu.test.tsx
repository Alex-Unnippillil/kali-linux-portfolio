import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhiskerMenu from '../components/menu/WhiskerMenu';

const originalAnalyticsFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;

afterAll(() => {
  if (originalAnalyticsFlag === undefined) {
    delete process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
  } else {
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = originalAnalyticsFlag;
  }
});

beforeEach(() => {
  localStorage.clear();
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS = 'false';
});

test('shows launcher hints on first open and hides after acknowledging', async () => {
  const user = userEvent.setup();
  render(<WhiskerMenu />);

  const launcherButton = screen.getByRole('button', { name: /applications/i });
  await user.click(launcherButton);

  const dialog = await screen.findByRole('dialog', { name: /launcher tips/i });
  expect(dialog).toBeInTheDocument();

  const gotIt = screen.getByRole('button', { name: /got it/i });
  await user.click(gotIt);

  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: /launcher tips/i })).not.toBeInTheDocument(),
  );
  expect(localStorage.getItem('launcher-hints-seen')).toBe('true');

  await user.click(launcherButton);
  await user.click(launcherButton);

  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: /launcher tips/i })).not.toBeInTheDocument(),
  );
});

test('persists never show again preference across sessions', async () => {
  const user = userEvent.setup();
  const { unmount } = render(<WhiskerMenu />);

  const launcherButton = screen.getByRole('button', { name: /applications/i });
  await user.click(launcherButton);

  await screen.findByRole('dialog', { name: /launcher tips/i });

  const neverShow = screen.getByRole('button', { name: /never show again/i });
  await user.click(neverShow);

  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: /launcher tips/i })).not.toBeInTheDocument(),
  );
  expect(localStorage.getItem('launcher-hints-opt-out')).toBe('true');

  await user.click(launcherButton);
  await user.click(launcherButton);

  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: /launcher tips/i })).not.toBeInTheDocument(),
  );

  unmount();
  render(<WhiskerMenu />);

  const reopenedButton = screen.getByRole('button', { name: /applications/i });
  await user.click(reopenedButton);

  await waitFor(() =>
    expect(screen.queryByRole('dialog', { name: /launcher tips/i })).not.toBeInTheDocument(),
  );
});
