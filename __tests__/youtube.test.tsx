import React from 'react';
import { render, screen } from '@testing-library/react';
import YouTubeApp from '../components/apps/youtube';

describe('YouTubeApp', () => {
  it('shows message when API key is missing', () => {
    delete process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    render(<YouTubeApp />);
    expect(
      screen.getByText(/YouTube API key is not configured/i)
    ).toBeInTheDocument();
  });
});
