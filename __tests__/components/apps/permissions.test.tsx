import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PermissionsApp from '../../../components/apps/permissions';
import { resetMockFileSystem } from '../../../utils/fileSystemMock';

describe('PermissionsApp', () => {
  beforeEach(() => {
    resetMockFileSystem();
  });

  it('updates the octal preview when toggling permissions', async () => {
    const user = userEvent.setup();
    render(<PermissionsApp />);

    expect(screen.getByText(/Octal preview: 750/)).toBeInTheDocument();

    const otherWrite = screen.getByRole('checkbox', {
      name: /Other Write/i,
    });

    await user.click(otherWrite);

    expect(screen.getByText(/Octal preview: 752/)).toBeInTheDocument();
  });

  it('shows dry-run warnings for system files', async () => {
    const user = userEvent.setup();
    render(<PermissionsApp />);

    await user.selectOptions(screen.getByLabelText('Target path'), ['/etc/passwd']);

    await user.click(
      screen.getByRole('checkbox', {
        name: /Other Read/i,
      })
    );

    await user.click(
      screen.getByRole('button', {
        name: /Preview \(dry run\)/i,
      })
    );

    expect(screen.getByText('Dry run simulation')).toBeInTheDocument();
    expect(
      screen.getByText('/etc/passwd is marked as a system file.')
    ).toBeInTheDocument();
    expect(screen.getByText(/644 -> 640/)).toBeInTheDocument();
  });

  it('requires typing the path before applying destructive changes', async () => {
    const user = userEvent.setup();
    render(<PermissionsApp />);

    await user.selectOptions(screen.getByLabelText('Target path'), ['/etc/passwd']);

    await user.click(
      screen.getByRole('checkbox', {
        name: /Other Read/i,
      })
    );

    const applyButton = screen.getByRole('button', { name: /Apply changes/i });
    expect(applyButton).toBeDisabled();

    const confirmationField = screen.getByLabelText(/Type the path to confirm/i);

    await user.type(confirmationField, '/wrong');
    expect(applyButton).toBeDisabled();

    await user.clear(confirmationField);
    await user.type(confirmationField, '/etc/passwd');
    expect(applyButton).toBeEnabled();

    await user.click(applyButton);

    expect(screen.getByText('Changes applied')).toBeInTheDocument();
    expect(
      screen.getByText('/etc/passwd is marked as a system file.')
    ).toBeInTheDocument();
  });
});
