import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import WorkflowCard from '../components/WorkflowCard';

const mockSteps = [
  {
    title: 'Planning',
    link: 'https://example.com/planning',
    description: 'Draft the scope and objectives.'
  },
  {
    title: 'Execution',
    link: 'https://example.com/execution',
    description: 'Carry out the agreed workflow.'
  }
];

describe('WorkflowCard', () => {
  it('renders workflow steps when provided', () => {
    render(<WorkflowCard steps={mockSteps} />);

    expect(screen.getByText('Planning')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Planning' })).toHaveAttribute(
      'href',
      'https://example.com/planning'
    );
    expect(screen.getByText('Draft the scope and objectives.')).toBeInTheDocument();
  });

  it('shows skeleton placeholders when loading', () => {
    render(<WorkflowCard isLoading steps={[]} />);

    const placeholders = screen.getAllByTestId('workflow-skeleton');
    expect(placeholders).toHaveLength(3);
  });

  it('transitions through loading, empty, and populated states', () => {
    const { rerender } = render(<WorkflowCard isLoading steps={[]} />);
    expect(screen.getAllByTestId('workflow-skeleton')).toHaveLength(3);

    rerender(
      <WorkflowCard
        steps={[]}
        emptyMessage="No items here."
        emptyCtaLabel="Add your first step"
        emptyCtaHref="https://example.com/add"
      />
    );

    expect(screen.queryAllByTestId('workflow-skeleton')).toHaveLength(0);
    expect(screen.getByText('No items here.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add your first step' })).toHaveAttribute(
      'href',
      'https://example.com/add'
    );

    rerender(<WorkflowCard steps={mockSteps} />);
    expect(screen.queryByText('No items here.')).not.toBeInTheDocument();
    expect(screen.getByText('Execution')).toBeInTheDocument();
  });
});

