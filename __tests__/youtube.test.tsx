import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { demoYouTubeVideos } from '../data/youtube/demoVideos';

let YouTubeApp: (typeof import('../components/apps/youtube'))['default'];

const SEARCH_DEBOUNCE_MS = 500;
const HISTORY_STORAGE_KEY = 'youtube:recently-watched';

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

  it('renders initial results and shows an empty history message', async () => {
    render(<YouTubeApp initialResults={demoYouTubeVideos} />);

    const firstVideo = demoYouTubeVideos[0];

    await waitFor(() => {
      expect(screen.getByTitle(`YouTube player for ${firstVideo.title}`)).toHaveAttribute(
        'src',
        expect.stringContaining(firstVideo.id),
      );
    });

    const historyItems = screen.getByTestId('recently-watched');
    expect(historyItems).toHaveTextContent('Your history is empty');
  });

  it('filters results using the demo library and clears history', async () => {
    jest.useFakeTimers();

    render(<YouTubeApp initialResults={demoYouTubeVideos} />);

    const input = screen.getByLabelText(/search videos/i);

    fireEvent.change(input, { target: { value: 'Wireshark' } });

    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
      jest.advanceTimersByTime(50);
      await Promise.resolve();
    });

    const demoResults = await screen.findAllByTestId('youtube-result-card');
    expect(
      demoResults.some((button) =>
        button.textContent?.toLowerCase().includes('wireshark deep dive'),
      ),
    ).toBe(true);

    const history = screen.getByTestId('recently-watched');
    await waitFor(() => {
      expect(history).toHaveTextContent('Your history is empty');
    });

    const wiresharkVideo = demoYouTubeVideos.find((video) =>
      video.title.includes('Wireshark Deep Dive'),
    );
    const wiresharkButton = document.querySelector<HTMLButtonElement>(
      `[data-video-id="${wiresharkVideo?.id}"]`,
    );
    expect(wiresharkButton).toBeTruthy();
    fireEvent.click(wiresharkButton!);

    await waitFor(() => {
      const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored as string);
      expect(parsed[0]?.id).toBe(wiresharkVideo?.id);
    });

    const clearButton = screen.getByTestId('youtube-history-clear');
    fireEvent.click(clearButton);

    await waitFor(() => {
      const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      expect(parsed.length).toBe(0);
    });

  });

  it('displays skeleton tiles when loading demo results without an API key', async () => {
    jest.useFakeTimers();

    render(<YouTubeApp initialResults={demoYouTubeVideos} />);

    const input = screen.getByLabelText(/search videos/i);

    fireEvent.change(input, { target: { value: 'OSINT' } });

    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      await Promise.resolve();
    });

    const skeletons = await screen.findAllByTestId('youtube-result-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);

    await act(async () => {
      jest.advanceTimersByTime(60);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.queryAllByTestId('youtube-result-skeleton')).toHaveLength(0);
    });

    expect(screen.getAllByTestId('youtube-result-card')[0]).toBeInTheDocument();
  });
});
