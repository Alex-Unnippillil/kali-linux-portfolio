import { fireEvent, render, screen } from '@testing-library/react';
import NessusReport from '../pages/nessus-report';

describe('Nessus sample report', () => {
  test('shows findings and detail panel with disclaimer', () => {
    render(<NessusReport />);
    expect(screen.getByText('Sample Nessus Report')).toBeInTheDocument();
    const items = screen.getAllByRole('button');
    expect(items.length).toBe(4);
    fireEvent.click(screen.getByRole('button', { name: /Weak SSH Cipher/ }));
    expect(
      screen.getByText(/Disclaimer: This sample report is for demonstration/)
    ).toBeInTheDocument();
  });
});
