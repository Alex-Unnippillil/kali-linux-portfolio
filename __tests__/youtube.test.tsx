import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YouTubeApp from '../components/apps/youtube';

const mockPlaylists = [
  {
    id: 'pl-alpha',
    title: 'Alpha Recon Playlists',
    description: 'Recon techniques and walkthroughs.',
    thumbnail: 'alpha.jpg',
    channelTitle: 'Blue Team Lab',
    channelId: 'blue-team',
    itemCount: 12,
    updatedAt: '2024-05-10T12:00:00.000Z',
  },
  {
    id: 'pl-beta',
    title: 'Beta Defense Strategies',
    description: 'Defensive hardening sessions.',
    thumbnail: 'beta.jpg',
    channelTitle: 'Red Team Research',
    channelId: 'red-team',
    itemCount: 7,
    updatedAt: '2024-06-01T12:00:00.000Z',
  },
  {
    id: 'pl-gamma',
    title: 'Gamma CTF Warmups',
    description: 'Quick capture-the-flag practice.',
    thumbnail: 'gamma.jpg',
    channelTitle: 'Blue Team Lab',
    channelId: 'blue-team',
    itemCount: 4,
    updatedAt: '2024-04-20T08:30:00.000Z',
  },
];

describe('YouTube playlist explorer', () => {
  it('renders initial playlists with outbound links', () => {
    render(<YouTubeApp initialResults={mockPlaylists} />);

    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(mockPlaylists.length);

    const firstCard = cards[0];
    expect(within(firstCard).getByText('Beta Defense Strategies')).toBeInTheDocument();

    const openLinks = screen.getAllByRole('link', { name: /open playlist/i });
    expect(openLinks[0]).toHaveAttribute(
      'href',
      expect.stringContaining(mockPlaylists[1].id),
    );
  });

  it('filters playlists by channel selection', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockPlaylists} />);

    await user.click(screen.getByRole('button', { name: /Blue Team Lab/i }));

    const visibleCards = screen.getAllByRole('article');
    expect(visibleCards).toHaveLength(2);
    expect(
      within(visibleCards[0]).getByText(/Alpha Recon Playlists/),
    ).toBeInTheDocument();
    expect(
      within(visibleCards[1]).getByText(/Gamma CTF Warmups/),
    ).toBeInTheDocument();
  });

  it('sorts playlists alphabetically when requested', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockPlaylists} />);

    await user.click(screen.getByRole('button', { name: 'Title A → Z' }));

    const cards = screen.getAllByRole('article');
    expect(within(cards[0]).getByText('Alpha Recon Playlists')).toBeInTheDocument();
    expect(within(cards[1]).getByText('Beta Defense Strategies')).toBeInTheDocument();
  });
});
