import React from 'react';
import { render, screen } from '@testing-library/react';
import CommunityPage from '../pages/community';
import links from '../content/community-links.json';

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('CommunityPage', () => {
  it('renders community links, breadcrumbs and disclaimer', () => {
    render(<CommunityPage />);

    expect(screen.getByText(/unofficial/i)).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveTextContent('Home');
    expect(nav).toHaveTextContent('Community');

    for (const link of links as { name: string; url: string }[]) {
      const el = screen.getByRole('link', { name: link.name });
      expect(el).toHaveAttribute('href', link.url);
    }
  });
});
