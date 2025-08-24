import { render, screen, fireEvent } from '@testing-library/react';
import BadgeList from '../components/BadgeList';
import type { Badge } from '../lib/types';

describe('BadgeList', () => {
  const badges: Badge[] = [
    { src: '/a.png', alt: 'A', label: 'Alpha', description: 'Alpha badge' },
    { src: '/b.png', alt: 'B', label: 'Beta', description: 'Beta badge' },
  ];

  it('filters badges and toggles modal', () => {
    render(<BadgeList badges={badges} />);

    expect(screen.getAllByRole('img')).toHaveLength(2);

    fireEvent.change(screen.getByPlaceholderText(/filter skills/i), {
      target: { value: 'alpha' },
    });
    expect(screen.getAllByRole('img')).toHaveLength(1);

    fireEvent.click(screen.getAllByRole('img')[0]);
    expect(screen.getByText('Alpha')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/close/i));
    expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
  });
});
