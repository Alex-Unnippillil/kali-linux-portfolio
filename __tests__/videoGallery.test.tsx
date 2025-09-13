import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VideoGallery from '../pages/video-gallery';

describe('VideoGallery keyboard navigation', () => {
  const xml = `
    <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
      <entry><yt:videoId>v1</yt:videoId><title>One</title></entry>
      <entry><yt:videoId>v2</yt:videoId><title>Two</title></entry>
      <entry><yt:videoId>v3</yt:videoId><title>Three</title></entry>
    </feed>
  `;

  beforeEach(() => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      text: async () => xml,
    } as any);
  });

  afterEach(() => {
    (global.fetch as jest.Mock).mockRestore();
  });

  it('navigates thumbnails with arrow, home, and end keys', async () => {
    render(<VideoGallery />);
    const buttons = await screen.findAllByRole('button');
    buttons[0].focus();
    fireEvent.keyDown(buttons[0], { key: 'ArrowRight' });
    expect(document.activeElement).toBe(buttons[1]);
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'End' });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Home' });
    expect(document.activeElement).toBe(buttons[0]);
  });
});
