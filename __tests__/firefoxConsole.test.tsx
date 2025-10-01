import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FirefoxConsole from '../components/apps/firefox/Console';

describe('Firefox developer console simulation', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('filters logs by level and keyword', async () => {
    const user = userEvent.setup();
    render(<FirefoxConsole />);

    await user.click(screen.getByRole('button', { name: 'Raise security alert' }));
    expect(
      screen.getByText('Simulated intrusion detected. Operator flagged suspicious beacon.')
    ).toBeInTheDocument();

    const searchbox = screen.getByRole('searchbox', { name: /filter logs by keyword/i });
    await user.type(searchbox, 'intrusion');
    expect(
      screen.getByText('Simulated intrusion detected. Operator flagged suspicious beacon.')
    ).toBeInTheDocument();

    await user.click(screen.getByLabelText('Error logs'));
    expect(
      screen.queryByText('Simulated intrusion detected. Operator flagged suspicious beacon.')
    ).not.toBeInTheDocument();
  });

  it('persists filter selections via localStorage', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<FirefoxConsole />);

    const infoToggle = screen.getByLabelText('Info logs');
    expect(infoToggle).toBeChecked();

    await user.click(infoToggle);
    expect(infoToggle).not.toBeChecked();

    unmount();

    render(<FirefoxConsole />);
    const restoredToggle = screen.getByLabelText('Info logs');
    expect(restoredToggle).not.toBeChecked();
    expect(
      screen.queryByText('Console ready — developer tools initialised.')
    ).not.toBeInTheDocument();
  });

  it('virtualizes large log batches without rendering every node', async () => {
    render(<FirefoxConsole />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate 10,000 events' }));

    await waitFor(() => {
      expect(screen.getAllByRole('option').length).toBeLessThan(200);
    });

    const list = screen.getByRole('listbox', { name: /firefox console output/i });

    await act(async () => {
      list.focus();
      fireEvent.keyDown(list, { key: 'End' });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() => {
      expect(screen.getByTestId('firefox-console-active-log')).toHaveTextContent('#10005');
    });
  });
});
