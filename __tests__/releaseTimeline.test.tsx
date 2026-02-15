import { render, screen } from '@testing-library/react';
import ReleaseTimeline from '../components/ReleaseTimeline';

describe('ReleaseTimeline', () => {
  it('renders anchors and tags', () => {
    const releases = [
      { version: '2.1.0', date: '2025-09-03', tags: ['Added', 'Fixed'] },
    ];
    render(<ReleaseTimeline releases={releases} />);
    const link = screen.getByRole('link', { name: '2.1.0' });
    expect(link).toHaveAttribute('href', '#v2.1.0');
    expect(screen.getByText('#Added')).toBeInTheDocument();
  });
});
