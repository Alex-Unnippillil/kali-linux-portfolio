import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AuthPanel, { AUTH_SESSION_STORAGE_KEY } from '@/apps/http/components/AuthPanel';
import { HTTPBuilder } from '@/apps/http';

describe('HTTP AuthPanel', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    window.sessionStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    } else {
      delete (navigator as { clipboard?: unknown }).clipboard;
    }
  });

  test('persists basic credentials within the session', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AuthPanel />);

    const typeSelect = screen.getByLabelText(/authorization type/i);
    await user.selectOptions(typeSelect, 'basic');

    const usernameInput = await screen.findByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(usernameInput, 'alice');
    await user.type(passwordInput, 'pa55w0rd');

    await waitFor(() =>
      expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toContain('alice'),
    );

    unmount();
    render(<AuthPanel />);

    expect(screen.getByLabelText(/authorization type/i)).toHaveValue('basic');
    expect(screen.getByLabelText(/username/i)).toHaveValue('alice');
    expect(screen.getByLabelText(/password/i)).toHaveValue('pa55w0rd');
  });

  test('redacts secrets when exporting the request JSON', async () => {
    const user = userEvent.setup();
    const writeText = jest.fn();

    if (navigator.clipboard) {
      jest.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
    } else {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });
    }

    render(<HTTPBuilder />);

    const typeSelect = screen.getByLabelText(/authorization type/i);
    await user.selectOptions(typeSelect, 'bearer');

    const tokenField = await screen.findByLabelText(/bearer token/i);
    await user.type(tokenField, 'super-secret-token');

    await waitFor(() =>
      expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toContain('super-secret-token'),
    );

    const exportButton = screen.getByRole('button', { name: /export json/i });
    await user.click(exportButton);

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const serialized = writeText.mock.calls[0][0];

    expect(serialized).not.toContain('super-secret-token');

    const payload = JSON.parse(serialized);
    expect(payload.auth).toEqual({
      type: 'bearer',
      token: '***redacted***',
      hasCredentials: true,
    });
  });

  test('reset session clears sessionStorage', async () => {
    const user = userEvent.setup();
    render(<AuthPanel />);

    const typeSelect = screen.getByLabelText(/authorization type/i);
    await user.selectOptions(typeSelect, 'bearer');

    const tokenField = await screen.findByLabelText(/bearer token/i);
    await user.type(tokenField, 'temporary-token');

    await waitFor(() =>
      expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toContain('temporary-token'),
    );

    const resetButton = screen.getByRole('button', { name: /reset session/i });
    await user.click(resetButton);

    await waitFor(() =>
      expect(window.sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull(),
    );
    expect(screen.getByLabelText(/authorization type/i)).toHaveValue('none');
  });
});
