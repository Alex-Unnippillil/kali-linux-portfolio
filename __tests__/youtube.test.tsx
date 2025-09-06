import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YouTubeApp from '../components/apps/youtube';

const mockVideos = [
  {
    id: 'a',
    title: 'Video A',
    thumbnail: 'a.jpg',
    channelName: 'Chan A',
    channelId: 'chanA',
  },
  {
    id: 'b',
    title: 'Video B',
    thumbnail: 'b.jpg',
    channelName: 'Chan B',
    channelId: 'chanB',
  },
];

describe('YouTube search app', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads video when thumbnail clicked', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockVideos} />);
    await user.click(screen.getByAltText('Video A'));
    const iframe = screen.getByTitle('YouTube video player');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('a'));
  });

  it('adds to queue and watch later lists', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockVideos} />);
    const queueButtons = screen.getAllByRole('button', { name: 'Queue' });
    const laterButtons = screen.getAllByRole('button', { name: 'Later' });
    await user.click(queueButtons[0]);
    await user.click(laterButtons[0]);

    expect(
      within(screen.getByTestId('queue-list')).getByText('Video A')
    ).toBeInTheDocument();
    const stored = JSON.parse(
      window.localStorage.getItem('youtube:watch-later') || '[]'
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe('a');
  });

  it('renders watch later playlist from storage', () => {
    window.localStorage.setItem('youtube:watch-later', JSON.stringify(mockVideos));
    render(<YouTubeApp initialResults={[]} />);
    const list = within(screen.getByTestId('watch-later-list'));
    expect(list.getByText('Video A')).toBeInTheDocument();
    expect(list.getByText('Video B')).toBeInTheDocument();
  });

  it('reorders watch later with keyboard', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockVideos} />);
    const laterButtons = screen.getAllByRole('button', { name: 'Later' });
    await user.click(laterButtons[0]);
    await user.click(laterButtons[1]);

    const list = screen.getByTestId('watch-later-list');
    const first = within(list).getByText('Video A').parentElement as HTMLElement;
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    await waitFor(() => {
      const items = within(list).getAllByText(/Video/);
      expect(items[0].textContent).toBe('Video B');
      expect(items[1].textContent).toBe('Video A');
    });
  });

  it('saves named clips with timestamps', async () => {
    const user = userEvent.setup();
    let curTime = 0;
    (window as any).YT = {
      Player: function (_el: any, { events }: any) {
        const obj = {
          getCurrentTime: () => curTime,
          getPlayerState: () => 0,
          loadVideoById: jest.fn(),
          pauseVideo: jest.fn(),
          playVideo: jest.fn(),
          seekTo: jest.fn(),
          getPlaybackRate: () => 1,
        };
        events?.onReady?.({ target: obj });
        return obj;
      },
      PlayerState: { PLAYING: 1 },
    };
    render(<YouTubeApp initialResults={mockVideos} />);
    await user.click(screen.getByAltText('Video A'));
    curTime = 5;
    await user.click(screen.getByLabelText('Set loop start'));
    curTime = 10;
    await user.click(screen.getByLabelText('Set loop end'));
    window.prompt = jest.fn().mockReturnValue('My Clip');
    await user.click(screen.getByLabelText('Save clip'));
    const stored = JSON.parse(
      window.localStorage.getItem('youtube:watch-later') || '[]'
    );
    expect(stored[0]).toMatchObject({
      id: 'a',
      start: 5,
      end: 10,
      name: 'My Clip',
    });
  });

  it('opens preferences modal with tabs', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockVideos} />);
    await user.click(screen.getByAltText('Video A'));
    await user.click(screen.getByTestId('prefs-button'));
    expect(screen.getByText('Video')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
    expect(screen.getByText('Subtitles')).toBeInTheDocument();
    expect(screen.getByText('Plugins')).toBeInTheDocument();
  });

  it('toggles mini player mode', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockVideos} />);
    await user.click(screen.getByAltText('Video A'));
    const toggle = screen.getByTestId('mini-player-toggle');
    await user.click(toggle);
    expect(screen.getByTestId('player-container').className).toContain('fixed');
  });

  it('handles J/K/L and space shortcuts', async () => {
    const user = userEvent.setup();
    let curTime = 50;
    let state = 1;
    const seekTo = jest.fn((t: number) => {
      curTime = t;
    });
    const pauseVideo = jest.fn(() => {
      state = 0;
    });
    const playVideo = jest.fn(() => {
      state = 1;
    });
    (window as any).YT = {
      Player: function (_el: any, { events }: any) {
        const obj = {
          getCurrentTime: () => curTime,
          getPlayerState: () => state,
          loadVideoById: jest.fn(),
          pauseVideo,
          playVideo,
          seekTo,
          getPlaybackRate: () => 1,
        };
        events?.onReady?.({ target: obj });
        return obj;
      },
      PlayerState: { PLAYING: 1 },
    };
    render(<YouTubeApp initialResults={mockVideos} />);
    await user.click(screen.getByAltText('Video A'));
    fireEvent.keyDown(window, { key: 'j' });
    expect(seekTo).toHaveBeenNthCalledWith(1, 40, true);
    fireEvent.keyDown(window, { key: 'l' });
    expect(seekTo).toHaveBeenNthCalledWith(2, 50, true);
    fireEvent.keyDown(window, { key: 'k' });
    expect(pauseVideo).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: ' ' });
    expect(playVideo).toHaveBeenCalled();
  });
});

