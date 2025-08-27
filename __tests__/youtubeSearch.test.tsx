import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YouTubeSearch from '../components/YouTubeSearch';

const mockData = [
  { id: '1', title: 'Cat Video' },
  { id: '2', title: 'Dog Video' },
];

describe('YouTubeSearch', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('searches mock data and stores recently watched', async () => {
    const user = userEvent.setup();
    render(<YouTubeSearch mockData={mockData} />);

    await user.type(screen.getByPlaceholderText(/search youtube/i), 'Cat');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(screen.getByText('Cat Video')).toBeInTheDocument();

    await user.click(screen.getByLabelText(/play video/i));

    const stored = JSON.parse(window.localStorage.getItem('recentlyWatched')!);
    expect(stored[0].id).toBe('1');

    const recent = screen.getByTestId('recent-list');
    expect(within(recent).getByText('Cat Video')).toBeInTheDocument();
  });
});

