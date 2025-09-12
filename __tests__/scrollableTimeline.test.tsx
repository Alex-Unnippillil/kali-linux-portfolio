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
  // @ts-ignore
  global.IntersectionObserver = IntersectionObserverMock;
});

describe('ScrollableTimeline', () => {
  it('toggles between year and month view', () => {
    render(<ScrollableTimeline />);
    // Initially shows years
    const year = screen.getByText('2012');
    expect(year).toBeInTheDocument();
    // Summary for first milestone is visible
    expect(
      screen.getByText('Started nuclear engineering studies at Ontario Tech.')
    ).toBeInTheDocument();

    // Clicking a year zooms to month view
    fireEvent.click(year);
    expect(screen.getByText('2012-09')).toBeInTheDocument();
    // Summary persists in month view
    expect(
      screen.getByText('Started nuclear engineering studies at Ontario Tech.')
    ).toBeInTheDocument();
    expect(screen.getByText('Back to years')).toBeInTheDocument();
  });
});

