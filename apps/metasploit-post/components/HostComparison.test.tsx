import { fireEvent, render, screen } from '@testing-library/react';
import HostComparison, { HostComparisonData } from './HostComparison';

const sampleData: HostComparisonData = {
  'host-alpha': {
    previous: [
      { title: 'post/windows/gather/old', output: 'Old output from previous run.' },
      { title: 'post/windows/gather/changed', output: 'Previous body' }
    ],
    current: [
      { title: 'post/windows/gather/changed', output: 'New body' },
      { title: 'post/windows/gather/new', output: 'Fresh output for current snapshot.' }
    ]
  },
  'host-bravo': {
    previous: [],
    current: []
  }
};

describe('HostComparison', () => {
  it('highlights additions, removals, and modifications for the active host', () => {
    render(<HostComparison data={sampleData} />);

    const added = screen.getByText('post/windows/gather/new').closest('li');
    const removed = screen.getByText('post/windows/gather/old').closest('li');
    const changed = screen.getByText('post/windows/gather/changed').closest('li');

    expect(added).toHaveAttribute('data-status', 'added');
    expect(removed).toHaveAttribute('data-status', 'removed');
    expect(changed).toHaveAttribute('data-status', 'changed');

    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Previous body')).toBeInTheDocument();
    expect(screen.getByText('New body')).toBeInTheDocument();
  });

  it('shows an empty state when a host has no differences', () => {
    render(<HostComparison data={sampleData} />);

    fireEvent.click(screen.getByRole('button', { name: 'host-bravo' }));

    expect(screen.getByText(/No changes detected for this host/i)).toBeInTheDocument();
  });
});
