import { fireEvent, render, screen, within } from '@testing-library/react';

import OpenVASReport from '../index';

describe('OpenVASReport filters and details', () => {
  it('filters findings by severity toggles', () => {
    render(<OpenVASReport />);

    expect(screen.getByText('OpenSSL Buffer Overflow')).toBeInTheDocument();

    const criticalToggle = screen.getByRole('button', {
      name: /Critical severity filter/,
    });

    fireEvent.click(criticalToggle);

    expect(screen.queryByText('OpenSSL Buffer Overflow')).not.toBeInTheDocument();
  });

  it('filters findings by type toggles', () => {
    render(<OpenVASReport />);

    const configurationToggle = screen.getByRole('button', {
      name: /Configuration type filter/,
    });

    fireEvent.click(configurationToggle);

    expect(screen.queryByText('SSH Weak Cipher')).not.toBeInTheDocument();
  });

  it('expands a row to reveal description, remediation, and timeline', () => {
    render(<OpenVASReport />);

    fireEvent.click(screen.getByText('OpenSSL Buffer Overflow'));

    const detailCell = screen
      .getByText('Remote code execution via crafted packet.')
      .closest('td');

    expect(detailCell).not.toBeNull();

    const detailWithin = within(detailCell as HTMLTableCellElement);

    expect(
      detailWithin.getByText('Remote code execution via crafted packet.'),
    ).toBeInTheDocument();
    expect(
      detailWithin.getByText('Update OpenSSL to the latest version'),
    ).toBeInTheDocument();
    expect(
      detailWithin.getByText('Detected during weekly scan.'),
    ).toBeInTheDocument();
  });
});
