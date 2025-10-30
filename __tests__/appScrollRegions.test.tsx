import React from 'react';
import { render, screen } from '@testing-library/react';
import Beef from '../components/apps/beef';
import Firefox from '../components/apps/firefox';
import SpotifyApp from '../components/apps/spotify';
import YouTubeApp from '../components/apps/youtube';
import NiktoApp from '../components/apps/nikto';

describe('app scrollable containers', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    (global as any).fetch = jest.fn(() =>
      Promise.resolve({
        json: async () => [],
      }),
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('exposes a scrollable region for the Beef app', async () => {
    render(<Beef />);
    const region = await screen.findByTestId('beef-scroll-region');
    expect(region).toHaveClass('overflow-y-auto');
  });

  it('exposes a scrollable region for the Firefox app', async () => {
    render(<Firefox />);
    const region = await screen.findByTestId('firefox-scroll-region');
    expect(region).toHaveClass('overflow-y-auto');
  });

  it('exposes a scrollable region for the Spotify app', async () => {
    render(<SpotifyApp />);
    const region = await screen.findByTestId('spotify-scroll-region');
    expect(region).toHaveClass('overflow-y-auto');
  });

  it('exposes a scrollable region for the YouTube app', async () => {
    render(<YouTubeApp />);
    const region = await screen.findByTestId('youtube-scroll-region');
    expect(region).toHaveClass('overflow-y-auto');
  });

  it('exposes a scrollable region for the Nikto app', async () => {
    render(<NiktoApp />);
    const region = await screen.findByTestId('nikto-scroll-region');
    expect(region).toHaveClass('overflow-y-auto');
  });
});
