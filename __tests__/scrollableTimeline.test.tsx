import { render, screen, fireEvent } from '@testing-library/react';
import ScrollableTimeline from '../components/ScrollableTimeline';

// Provide a minimal IntersectionObserver mock for the test environment
beforeAll(() => {
  class IntersectionObserverMock {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() { return []; }
  }
  // @ts-expect-error IntersectionObserver missing in Node
  global.IntersectionObserver = IntersectionObserverMock;
});

describe('ScrollableTimeline', () => {
  it('toggles between year and month view', () => {
    render(<ScrollableTimeline />);
    // Initially shows years
    const year = screen.getByText('2012');
    expect(year).toBeInTheDocument();

    // Clicking a year zooms to month view
    fireEvent.click(year);
    expect(screen.getByText('2012-09')).toBeInTheDocument();
    expect(screen.getByText('Back to years')).toBeInTheDocument();
  });
});

