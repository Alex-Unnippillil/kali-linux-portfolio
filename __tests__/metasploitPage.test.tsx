import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MetasploitPage from '../apps/metasploit';

describe('Metasploit page module filtering', () => {
  it('filters modules by search, exposes command builder inputs, and surfaces canned output', () => {
    render(<MetasploitPage />);

    // Expand tree to reveal a known module.
    fireEvent.click(screen.getAllByText('auxiliary')[0]);
    fireEvent.click(screen.getAllByText('admin')[0]);
    fireEvent.click(screen.getAllByText('2wire')[0]);
    const moduleButton = screen.getByText('xslt_password_reset');
    expect(moduleButton).toBeInTheDocument();

    // Selecting the module populates the command builder input with the module path.
    fireEvent.click(moduleButton);
    const moduleInput = screen.getByLabelText('Module path');
    expect(moduleInput).toHaveValue('auxiliary/admin/2wire/xslt_password_reset');

    // Builder renders module options from the JSON metadata.
    const rhostsInput = screen.getByLabelText(/RHOSTS/i);
    fireEvent.change(rhostsInput, { target: { value: '10.10.0.5' } });
    fireEvent.click(screen.getByRole('button', { name: /Build command/i }));
    expect(screen.getByTestId('metasploit-command-preview').textContent).toContain(
      'set RHOSTS 10.10.0.5',
    );

    // Search filters the module list.
    fireEvent.change(screen.getAllByPlaceholderText('Search modules')[0], {
      target: { value: 'nonexistent-module' },
    });
    expect(screen.queryByText('xslt_password_reset')).toBeNull();

    // Lab warnings and canned console output are visible for offline guidance.
    expect(screen.getByText('Lab Warnings')).toBeInTheDocument();
    expect(screen.getByTestId('metasploit-canned-console').textContent).toContain(
      'Lab warning',
    );
  });
});
