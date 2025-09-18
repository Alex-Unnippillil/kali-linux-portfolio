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
    await waitFor(() => {
      const queueStored = JSON.parse(
        window.localStorage.getItem('youtube:queue') || '[]'
      );
      expect(queueStored).toHaveLength(1);
      expect(queueStored[0].id).toBe('a');
    });
    await waitFor(() => {
      const laterStored = JSON.parse(
        window.localStorage.getItem('youtube:watch-later') || '[]'
      );
      expect(laterStored).toHaveLength(1);
      expect(laterStored[0].id).toBe('a');
    });
  });

  it('renders playlists from storage', () => {
    window.localStorage.setItem(
      'youtube:watch-later',
      JSON.stringify(mockVideos)
    );
    window.localStorage.setItem(
      'youtube:queue',
      JSON.stringify([mockVideos[1]])
    );
    render(<YouTubeApp initialResults={[]} />);
    const watchLaterList = within(screen.getByTestId('watch-later-list'));
    expect(watchLaterList.getByText('Video A')).toBeInTheDocument();
    expect(watchLaterList.getByText('Video B')).toBeInTheDocument();
    const queueList = within(screen.getByTestId('queue-list'));
    expect(queueList.getByText('Video B')).toBeInTheDocument();
  });

  it('reorders watch later with keyboard', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockVideos} />);
    const laterButtons = screen.getAllByRole('button', { name: 'Later' });
    await user.click(laterButtons[0]);
    await user.click(laterButtons[1]);

    const list = screen.getByTestId('watch-later-list');
    const firstItem = within(list).getAllByTestId('watch-later-list-item')[0];
    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
    await waitFor(() => {
      const items = within(list)
        .getAllByTestId('watch-later-list-item')
        .map((item) => within(item).getByText(/Video/).textContent);
      expect(items[0]).toBe('Video B');
      expect(items[1]).toBe('Video A');
    });
  });

  it('reorders queue with keyboard', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockVideos} />);
    const queueButtons = screen.getAllByRole('button', { name: 'Queue' });
    await user.click(queueButtons[0]);
    await user.click(queueButtons[1]);

    const list = screen.getByTestId('queue-list');
    const firstItem = within(list).getAllByTestId('queue-list-item')[0];
    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
    await waitFor(() => {
      const items = within(list)
        .getAllByTestId('queue-list-item')
        .map((item) => within(item).getByText(/Video/).textContent);
      expect(items[0]).toBe('Video B');
      expect(items[1]).toBe('Video A');
    });
  });

  it('removes items from queue and watch later', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialResults={mockVideos} />);
    const queueButtons = screen.getAllByRole('button', { name: 'Queue' });
    const laterButtons = screen.getAllByRole('button', { name: 'Later' });
    await user.click(queueButtons[0]);
    await user.click(queueButtons[1]);
    await user.click(laterButtons[0]);

    const queueList = within(screen.getByTestId('queue-list'));
    await user.click(
      queueList.getAllByRole('button', { name: 'Remove from queue' })[0]
    );
    expect(queueList.queryByText('Video A')).not.toBeInTheDocument();
    await waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem('youtube:queue') || '[]'
      );
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('b');
    });

    const watchLaterList = within(screen.getByTestId('watch-later-list'));
    await user.click(
      watchLaterList.getByRole('button', { name: 'Remove from watch later' })
    );
    expect(watchLaterList.queryByText('Video A')).not.toBeInTheDocument();
    await waitFor(() => {
      const stored = JSON.parse(
        window.localStorage.getItem('youtube:watch-later') || '[]'
      );
      expect(stored).toHaveLength(0);
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
});

