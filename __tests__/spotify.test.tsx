import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  (globalThis as any).requestAnimationFrame = () => 0;
}

if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  (globalThis as any).cancelAnimationFrame = () => {};
}

jest.mock('../apps/spotify/utils/crossfade', () => {
  return jest.fn().mockImplementation(() => ({
    play: jest.fn().mockResolvedValue(undefined),
    toggle: jest.fn(),
    getAnalyser: jest.fn(() => null),
    getCurrentTime: jest.fn(() => 0),
    getDuration: jest.fn(() => 0),
    seek: jest.fn(),
    dispose: jest.fn(),
  }));
});

jest.mock('../apps/spotify/Lyrics', () => () => null);
jest.mock('../apps/spotify/Visualizer', () => () => null);

import SpotifyApp from '../apps/spotify';

describe('Spotify media indicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    const rafMock = jest.fn().mockReturnValue(0);
    (window.requestAnimationFrame as any) = rafMock;
    (global as any).requestAnimationFrame = rafMock;
    (globalThis as any).requestAnimationFrame = rafMock;
    const cafMock = jest.fn();
    (window.cancelAnimationFrame as any) = cafMock;
    (global as any).cancelAnimationFrame = cafMock;
    (globalThis as any).cancelAnimationFrame = cafMock;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('shows indicator when media key pressed while focused and clears after timeout', () => {
    render(<SpotifyApp />);
    const app = screen.getByTestId('spotify-app');

    act(() => {
      fireEvent.focus(app);
    });
    act(() => {
      fireEvent.keyDown(app, { code: 'MediaTrackNext' });
    });

    expect(screen.getByTestId('spotify-media-indicator')).toHaveTextContent('Next track');

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.queryByTestId('spotify-media-indicator')).toBeNull();
  });

  it('does not show indicator when the app is not focused', () => {
    render(<SpotifyApp />);
    const app = screen.getByTestId('spotify-app');

    act(() => {
      fireEvent.keyDown(app, { code: 'MediaTrackPrevious' });
    });

    expect(screen.queryByTestId('spotify-media-indicator')).toBeNull();
  });

  it('clears indicator when focus is lost', () => {
    render(<SpotifyApp />);
    const app = screen.getByTestId('spotify-app');

    act(() => {
      fireEvent.focus(app);
    });
    act(() => {
      fireEvent.keyDown(app, { code: 'MediaPlayPause' });
    });

    expect(screen.getByTestId('spotify-media-indicator')).toHaveTextContent('Play/Pause');

    act(() => {
      fireEvent.blur(app);
    });

    expect(screen.queryByTestId('spotify-media-indicator')).toBeNull();
  });
});

