import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import XTimeline from '../../apps/x';
import { SettingsProvider } from '../../hooks/useSettings';

jest.mock('../../apps/x/embed', () => ({
  loadEmbedScript: jest.fn().mockResolvedValue({
    createTimeline: jest.fn(),
  }),
}));

describe('XTimeline saved mode', () => {
  beforeEach(() => {
    localStorage.clear();
    (global as any).Notification = {
      permission: 'denied',
      requestPermission: jest.fn(),
    };
    (global as any).crypto = {
      randomUUID: jest.fn(() => 'uuid-test'),
    };
  });

  it('switches to saved mode and renders saved tweets without loading embeds', async () => {
    const view = render(
      <SettingsProvider>
        <XTimeline />
      </SettingsProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Saved' }));

    expect(screen.queryByText(/Load timeline/i)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Tweet handle/i), 'LocalUser');
    await userEvent.type(screen.getByLabelText(/Saved tweet text/i), 'Stored tweet');
    await userEvent.type(
      screen.getByLabelText(/Saved tweet time/i),
      '2024-05-01T10:00',
    );
    await userEvent.click(screen.getByRole('button', { name: /Add to saved timeline/i }));

    await waitFor(() => {
      expect(screen.getByText('Stored tweet')).toBeInTheDocument();
    });

    view.unmount();
  });
});
