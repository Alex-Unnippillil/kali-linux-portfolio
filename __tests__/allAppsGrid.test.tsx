import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import AllApps from '@apps/all-apps';

jest.mock('../apps.config', () => ({
  __esModule: true,
  default: [
    { id: 'alpha', title: 'Alpha', icon: '/alpha.svg' },
    { id: 'beta', title: 'Beta', icon: '/beta.svg' },
  ],
  games: [
    { id: 'gamma', title: 'Gamma', icon: '/gamma.svg' },
  ],
}));

describe('AllApps component', () => {

  it('filters apps by search term', () => {
    const { getByPlaceholderText, queryByText } = render(<AllApps />);
    const input = getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'Alpha' } });
    expect(queryByText('Alpha')).toBeInTheDocument();
    expect(queryByText('Beta')).not.toBeInTheDocument();
  });

  it('links to app route without prefetch', () => {
    const { getByText } = render(<AllApps />);
    const link = getByText('Alpha').closest('a');
    expect(link).toHaveAttribute('href', '/apps/alpha');
  });
});
