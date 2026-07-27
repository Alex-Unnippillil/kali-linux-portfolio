import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NiktoApp from '../../../components/apps/nikto';

describe('Nikto rule categories', () => {
  it('updates pending checks when categories are toggled', async () => {
    const user = userEvent.setup();
    render(<NiktoApp />);

    const pendingList = within(await screen.findByTestId('pending-checks'));
    expect(
      pendingList.getByText(/Server banner disclosure/i)
    ).toBeInTheDocument();
    expect(
      pendingList.getByText(/Missing security headers/i)
    ).toBeInTheDocument();

    const headersCheckbox = screen.getByLabelText(/Headers/i);
    await user.click(headersCheckbox);

    expect(
      screen.queryByText(/Missing security headers/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Admin console discovery/i)
    ).toBeInTheDocument();

    await user.click(headersCheckbox);
    expect(
      screen.getByText(/Missing security headers/i)
    ).toBeInTheDocument();
  });
});
