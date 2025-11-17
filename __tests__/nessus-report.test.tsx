import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NessusReport from '../pages/nessus-report';

describe('Nessus sample report', () => {
  test('shows findings and drawer with disclaimer', () => {
    render(<NessusReport />);
    expect(screen.getByText('Sample Nessus Report')).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(5); // header + 4 findings
    fireEvent.click(screen.getByText('Weak SSH Cipher'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(/Disclaimer: This sample report is for demonstration/)
    ).toBeInTheDocument();
  });

  test('filters by severity', () => {
    render(<NessusReport />);
    fireEvent.change(screen.getByLabelText('Filter severity'), {
      target: { value: 'High' },
    });
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(2); // header + 1 finding
    expect(
      screen.getByText('Apache HTTP Server Privilege Escalation')
    ).toBeInTheDocument();
  });

  test('filters by host', () => {
    render(<NessusReport />);
    fireEvent.change(screen.getByLabelText('Filter host'), {
      target: { value: 'server1.example.com' },
    });
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(3); // header + 2 findings
    expect(
      screen.getByText('Apache HTTP Server Privilege Escalation')
    ).toBeInTheDocument();
  });

  test('filters by plugin family', () => {
    render(<NessusReport />);
    fireEvent.change(screen.getByLabelText('Filter family'), {
      target: { value: 'SSH' },
    });
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(2); // header + 1 finding
    expect(screen.getByText('Weak SSH Cipher')).toBeInTheDocument();
  });

  test('keeps focus trapped in drawer', async () => {
    render(<NessusReport />);
    fireEvent.click(screen.getByText('Weak SSH Cipher'));
    const closeBtn = screen.getByText('Close');
    expect(closeBtn).toHaveFocus();
    await userEvent.tab();
    expect(closeBtn).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(closeBtn).toHaveFocus();
  });
});
