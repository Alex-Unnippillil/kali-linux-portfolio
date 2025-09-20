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

  afterEach(() => {
    delete (window as any).YT;
  });

  it('initializes embeds with privacy-enhanced parameters', async () => {
    const user = userEvent.setup();
    const createPlayer = jest.fn((_el, opts) => {
      opts.events?.onReady?.({
        target: {
          getPlaybackRate: () => 1,
        },
      });
      return {
        loadVideoById: jest.fn(),
        getPlaybackRate: jest.fn().mockReturnValue(1),
        getPlayerState: jest.fn().mockReturnValue(2),
        playVideo: jest.fn(),
        pauseVideo: jest.fn(),
        seekTo: jest.fn(),
        getCurrentTime: jest.fn().mockReturnValue(0),
        getAvailablePlaybackRates: jest.fn().mockReturnValue([1]),
      };
    });
    (window as any).YT = {
      Player: createPlayer,
      PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
    };

    render(<YouTubeApp initialResults={mockVideos} />);
    await user.click(screen.getByAltText('Video A'));

    await waitFor(() => expect(createPlayer).toHaveBeenCalled());
    const [, options] = createPlayer.mock.calls[0];
    expect(options.host).toBe('https://www.youtube-nocookie.com');
    expect(options.playerVars).toMatchObject({
      rel: 0,
      modestbranding: 1,
      enablejsapi: 1,
      origin: window.location.origin,
    });
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
});

