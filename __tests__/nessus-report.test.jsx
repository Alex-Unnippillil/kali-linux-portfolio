import { fireEvent, render, screen } from '@testing-library/react';
import NessusReport from '../pages/nessus-report';
describe('Nessus sample report', () => {
    test('shows findings and drawer with disclaimer', () => {
        render(<NessusReport />);
        expect(screen.getByText('Sample Nessus Report')).toBeInTheDocument();
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBe(5); // header + 4 findings
        fireEvent.click(screen.getByText('Weak SSH Cipher'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/Disclaimer: This sample report is for demonstration/)).toBeInTheDocument();
    });
    test('filters by severity', () => {
        render(<NessusReport />);
        fireEvent.change(screen.getByLabelText('Filter severity'), {
            target: { value: 'High' },
        });
        const rows = screen.getAllByRole('row');
        expect(rows.length).toBe(2); // header + 1 finding
        expect(screen.getByText('Apache HTTP Server Privilege Escalation')).toBeInTheDocument();
    });
});
