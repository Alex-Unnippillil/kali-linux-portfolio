import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import AppArmorLab from '../../../components/apps/apparmor';

describe('AppArmor learning lab', () => {
  test('updates profile mode when toggles change', () => {
    render(<AppArmorLab />);

    const statusBadge = screen.getByTestId('profile-status-demo-browser');
    expect(statusBadge).toHaveTextContent('enforce');

    fireEvent.click(screen.getByLabelText(/Demo Browser complain mode/i));

    expect(statusBadge).toHaveTextContent('complain');
  });

  test('walks through learning flow and shows generated diff', () => {
    render(<AppArmorLab />);

    expect(screen.getByText(/profile demo-browser/i)).toBeInTheDocument();

    let nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    expect(
      screen.getByText(/Permit desktop notifications over D-Bus/i)
    ).toBeInTheDocument();

    nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    expect(
      screen.getByLabelText('Include suggestion: Allow reading user configuration files')
    ).toBeChecked();

    nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    const diff = screen.getByTestId('apparmor-profile-diff');
    expect(diff.textContent).toContain('+++ demo-browser.learned');
    expect(diff.textContent).toContain('owner @{HOME}/.config/demo-browser/** rw,');

    const preview = screen.getByTestId('apparmor-profile-preview');
    expect(preview.textContent).toContain('capability net_bind_service');
  });
});
