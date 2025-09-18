import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SpotifyApp from '../apps/spotify';

beforeAll(() => {
  if (typeof window !== 'undefined') {
    if (!window.requestAnimationFrame) {
      window.requestAnimationFrame = (cb: FrameRequestCallback) => {
        cb(performance.now());
        return 0;
      };
    }
    if (!window.cancelAnimationFrame) {
      window.cancelAnimationFrame = () => {};
    }
  }
  // @ts-ignore - align global helpers with window mocks for tests
  global.requestAnimationFrame = window.requestAnimationFrame;
  // @ts-ignore - align global helpers with window mocks for tests
  global.cancelAnimationFrame = window.cancelAnimationFrame;
});

describe('Spotify mini player', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists mini player position across sessions', async () => {
    const { unmount } = render(<SpotifyApp />);
    const toggle = screen.getByRole('button', { name: /mini/i });
    fireEvent.click(toggle);

    const mini = await screen.findByTestId('spotify-mini-player');
    const handle = screen.getByTestId('spotify-mini-drag-handle');
    const startLeft = parseInt(mini.style.left || '0', 10);
    const startTop = parseInt(mini.style.top || '0', 10);

    fireEvent.mouseDown(handle, {
      clientX: startLeft + 10,
      clientY: startTop + 10,
      button: 0,
    });

    fireEvent.mouseMove(document, {
      clientX: startLeft + 60,
      clientY: startTop + 70,
    });

    fireEvent.mouseUp(document, {
      clientX: startLeft + 60,
      clientY: startTop + 70,
    });

    const expectedPosition = {
      x: startLeft + 50,
      y: startTop + 60,
    };

    await waitFor(() => {
      const stored = window.localStorage.getItem('spotify-mini-position');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored as string)).toEqual(expectedPosition);
    });

    unmount();

    render(<SpotifyApp />);
    const miniAgain = await screen.findByTestId('spotify-mini-player');
    expect(miniAgain.style.left).toBe(`${expectedPosition.x}px`);
    expect(miniAgain.style.top).toBe(`${expectedPosition.y}px`);
  });

  it('detaches and reattaches the mini player', async () => {
    render(<SpotifyApp />);
    const toggle = screen.getByRole('button', { name: /mini/i });
    fireEvent.click(toggle);

    await screen.findByTestId('spotify-mini-player');
    await waitFor(() => {
      expect(window.localStorage.getItem('spotify-mini')).toBe('true');
    });
    expect(screen.getByText(/mini player detached/i)).toBeInTheDocument();

    const returnButton = await screen.findByRole('button', {
      name: /return to full player/i,
    });
    fireEvent.click(returnButton);

    await waitFor(() => {
      expect(screen.queryByTestId('spotify-mini-player')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(window.localStorage.getItem('spotify-mini')).toBe('false');
    });
    expect(screen.queryByText(/mini player detached/i)).not.toBeInTheDocument();
  });
});
