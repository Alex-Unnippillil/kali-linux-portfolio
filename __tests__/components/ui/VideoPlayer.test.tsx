import { render, screen, waitFor } from '@testing-library/react';

import VideoPlayer from '../../../components/ui/VideoPlayer';

describe('VideoPlayer', () => {
  afterEach(() => {
    // cleanup PiP mocks between tests
    delete (document as any).pictureInPictureEnabled;
    delete (HTMLVideoElement.prototype as any).requestPictureInPicture;
    delete (window as any).documentPictureInPicture;
  });

  it('renders caption tracks when provided', () => {
    const { container, queryByText } = render(
      <VideoPlayer
        src="video.mp4"
        tracks={[
          {
            src: 'captions-en.vtt',
            label: 'English',
            srcLang: 'en',
            default: true,
          },
        ]}
      />
    );

    const trackElements = container.querySelectorAll('track');
    expect(trackElements).toHaveLength(1);
    expect(trackElements[0].getAttribute('kind')).toBe('captions');
    expect(trackElements[0].getAttribute('src')).toBe('captions-en.vtt');
    expect(queryByText(/Captions unavailable/i)).toBeNull();
  });

  it('shows fallback message when no caption tracks exist', () => {
    render(
      <VideoPlayer
        src="video.mp4"
        tracks={[
          {
            src: 'subtitles-es.vtt',
            label: 'Español',
            srcLang: 'es',
            kind: 'subtitles',
          },
        ]}
      />
    );

    expect(screen.getByText(/Captions unavailable/i)).toBeInTheDocument();
  });

  it('exposes keyboard labeled controls when PiP features are supported', async () => {
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      configurable: true,
      value: true,
    });
    (HTMLVideoElement.prototype as any).requestPictureInPicture = jest.fn();
    (window as any).documentPictureInPicture = {};

    render(<VideoPlayer src="video.mp4" />);

    const pipButton = await screen.findByRole('button', {
      name: /picture-in-picture mode/i,
    });
    expect(pipButton).toHaveAttribute('aria-keyshortcuts', 'Shift+P');

    const docPipButton = await screen.findByRole('button', {
      name: /document picture-in-picture controls/i,
    });
    expect(docPipButton).toHaveAttribute('aria-keyshortcuts', 'Shift+D');

    await waitFor(() => {
      expect(pipButton).toBeVisible();
      expect(docPipButton).toBeVisible();
    });
  });
});

