import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import YouTubeApp from '../components/apps/youtube';

const mockVideos = [
  {
    id: '1',
    title: 'React Tutorial',
    playlist: 'Dev',
    publishedAt: '2022-01-01T00:00:00Z',
    thumbnail: 'thumb1.jpg',
    url: 'https://youtu.be/1',
  },
  {
    id: '2',
    title: 'Cooking with React',
    playlist: 'Cook',
    publishedAt: '2022-02-01T00:00:00Z',
    thumbnail: 'thumb2.jpg',
    url: 'https://youtu.be/2',
  },
  {
    id: '3',
    title: 'Advanced React',
    playlist: 'Dev',
    publishedAt: '2021-06-01T00:00:00Z',
    thumbnail: 'thumb3.jpg',
    url: 'https://youtu.be/3',
  },
];

describe('YouTubeApp', () => {
  it('filters hide other categories', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);
    expect(screen.getAllByTestId('video-card')).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Dev' }));
    expect(screen.getAllByTestId('video-card')).toHaveLength(2);
    expect(screen.queryByText('Cooking with React')).not.toBeInTheDocument();
  });

  it('sorting by title reorders list', async () => {
    const user = userEvent.setup();
    render(<YouTubeApp initialVideos={mockVideos} />);
    const getTitles = () =>
      screen.getAllByTestId('video-title').map((el) => el.textContent);

    expect(getTitles()).toEqual([
      'Cooking with React',
      'React Tutorial',
      'Advanced React',
    ]);

    await user.selectOptions(screen.getByLabelText(/sort by/i), 'title');
    expect(getTitles()).toEqual([
      'Advanced React',
      'Cooking with React',
      'React Tutorial',
    ]);
  });

  it('player mounts only after click', async () => {
    const user = userEvent.setup();
    // Mock YouTube IFrame API
    // @ts-ignore
    window.YT = {
      Player: jest.fn((element) => {
        const iframe = document.createElement('iframe');
        element.appendChild(iframe);
      }),
    };

    render(<YouTubeApp initialVideos={[mockVideos[0]]} />);
    expect(document.querySelector('iframe')).toBeNull();
    await user.click(screen.getByLabelText(/play video/i));
    expect(window.YT.Player).toHaveBeenCalledTimes(1);
    expect(document.querySelector('iframe')).not.toBeNull();
  });
});
