import { render, screen } from '@testing-library/react';
import ScrollableTimeline from '../components/ScrollableTimeline';

describe('ScrollableTimeline', () => {
  it('renders milestones with sticky day headers', () => {
    render(<ScrollableTimeline />);

    expect(screen.getByRole('heading', { name: /career timeline/i })).toBeInTheDocument();

    const dayHeader = screen.getByText(/Sep\s+1,\s+2012/i);
    expect(dayHeader).toBeInTheDocument();
    const headerElement = dayHeader.closest('header');
    expect(headerElement).toHaveClass('sticky');

    const links = screen.getAllByRole('link', { name: /visit resource/i });
    expect(links.length).toBeGreaterThan(0);
  });
});

