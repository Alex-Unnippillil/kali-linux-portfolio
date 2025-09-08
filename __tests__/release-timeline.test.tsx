import { render, screen } from '@testing-library/react';
import Timeline from '../components/releases/Timeline';

const mockReleases = [
  { title: 'Release 1', link: 'https://example.com/1', pubDate: '2025-01-01' },
  { title: 'Release 2', link: 'https://example.com/2', pubDate: '2025-02-01' },
];

describe('Release Timeline', () => {
  it('renders release items with correct links', () => {
    render(<Timeline releases={mockReleases} />);
    mockReleases.forEach((r) => {
      const link = screen.getByText(r.title).closest('a');
      expect(link).toHaveAttribute('href', r.link);
    });
  });
});
