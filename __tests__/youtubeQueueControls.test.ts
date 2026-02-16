import { filterPlaylistVideos, sortPlaylistVideos } from '../components/apps/youtube';
import type { YouTubePlaylistVideo } from '../utils/youtube';

function makeVideo(overrides: Partial<YouTubePlaylistVideo>): YouTubePlaylistVideo {
  return {
    videoId: 'video-1',
    title: 'Video Title',
    description: 'Video description',
    thumbnail: '',
    publishedAt: '2024-01-01T00:00:00.000Z',
    position: 0,
    ...overrides,
  };
}

describe('youtube queue controls helpers', () => {
  const videos = [
    makeVideo({
      videoId: 'zeta',
      title: 'Zeta release',
      description: 'deep dive',
      publishedAt: '2023-10-01T00:00:00.000Z',
    }),
    makeVideo({
      videoId: 'alpha',
      title: 'Alpha update',
      description: 'platform walkthrough',
      publishedAt: '2024-05-01T00:00:00.000Z',
    }),
    makeVideo({
      videoId: 'beta',
      title: 'Beta recap',
      description: 'feature highlights',
      publishedAt: '2024-01-10T00:00:00.000Z',
    }),
  ];

  it('sorts videos by newest first', () => {
    const sorted = sortPlaylistVideos(videos, 'newest');
    expect(sorted.map((video) => video.videoId)).toEqual(['alpha', 'beta', 'zeta']);
  });

  it('sorts videos by oldest first', () => {
    const sorted = sortPlaylistVideos(videos, 'oldest');
    expect(sorted.map((video) => video.videoId)).toEqual(['zeta', 'beta', 'alpha']);
  });

  it('sorts videos alphabetically by title', () => {
    const sorted = sortPlaylistVideos(videos, 'title');
    expect(sorted.map((video) => video.videoId)).toEqual(['alpha', 'beta', 'zeta']);
  });

  it('filters videos by matching title or description', () => {
    const filtered = filterPlaylistVideos(videos, 'WALKTHROUGH');
    expect(filtered.map((video) => video.videoId)).toEqual(['alpha']);
  });

  it('returns all videos when the filter is blank', () => {
    const filtered = filterPlaylistVideos(videos, '   ');
    expect(filtered).toHaveLength(3);
  });
});
