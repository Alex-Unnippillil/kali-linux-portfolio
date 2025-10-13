import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import HelpPanel from '../../components/HelpPanel';

describe('HelpPanel keyboard shortcut', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('toggles open with the ? shortcut and loads contextual help', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('# Terminal Help'),
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(<HelpPanel appId="terminal" />);

    const toggleButton = screen.getByRole('button', { name: /help/i });
    expect(toggleButton).toHaveAttribute('aria-keyshortcuts', '?');

    fireEvent.keyDown(window, { key: '?' });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/docs/apps/terminal.md'));
    expect(await screen.findByText('Terminal Help')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: '?' });

    await waitFor(() => {
      expect(screen.queryByText('Terminal Help')).not.toBeInTheDocument();
    });
  });
});
