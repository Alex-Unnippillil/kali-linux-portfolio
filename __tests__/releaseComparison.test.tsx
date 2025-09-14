import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReleaseComparison from '../pages/release-comparison';

describe('ReleaseComparison', () => {
  it('filters table rows by component', async () => {
    const user = userEvent.setup();
    render(<ReleaseComparison />);

    // header + 3 rows
    expect(screen.getAllByRole('row')).toHaveLength(4);

    await user.type(screen.getByPlaceholderText(/filter components/i), 'kernel');

    // header + 1 filtered row
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.getByText('Kernel')).toBeInTheDocument();
    expect(screen.queryByText('Image')).not.toBeInTheDocument();
  });
});
