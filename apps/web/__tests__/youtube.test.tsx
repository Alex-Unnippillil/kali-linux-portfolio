import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { demoYouTubeVideos } from '../data/youtube/demoVideos';

let YouTubeApp: (typeof import('../components/apps/youtube'))['default'];

describe('YouTubeApp', () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_YOUTUBE_API_KEY = '';
    ({ default: YouTubeApp } = await import('../components/apps/youtube'));
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders initial results and loads a video into the watch view', async () => {
    render(<YouTubeApp initialResults={demoYouTubeVideos} />);

    const firstVideo = demoYouTubeVideos[0];
    const watchButton = screen.getByRole('button', { name: `Watch ${firstVideo.title}` });

    fireEvent.click(watchButton);

    await waitFor(() => {
      expect(screen.getByTitle(`YouTube player for ${firstVideo.title}`)).toHaveAttribute(
        'src',
        expect.stringContaining(firstVideo.id),
      );
    });

    const historyItems = screen.getByTestId('recently-watched');
    expect(historyItems).toHaveTextContent(firstVideo.title);
  });

  it('filters results using the demo library and clears history', async () => {
    jest.useFakeTimers();

    render(<YouTubeApp initialResults={demoYouTubeVideos} />);

    const input = screen.getByLabelText(/search videos/i);

    fireEvent.change(input, { target: { value: 'Wireshark' } });

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Watch Wireshark Deep Dive/i })).toBeInTheDocument();
    });

    const history = screen.getByTestId('recently-watched');
    expect(history).toHaveTextContent('Your history is empty');

    const clearButton = screen.getByRole('button', { name: /Clear history/i });
    fireEvent.click(clearButton);

    expect(history).toHaveTextContent('Your history is empty');

  });
});
