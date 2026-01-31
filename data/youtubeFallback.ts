import type {
  YouTubeChannelSummary,
  YouTubePlaylistDirectory,
  YouTubePlaylistSummary,
  YouTubePlaylistVideo,
} from '../utils/youtube';

const playlistSummaries: YouTubePlaylistSummary[] = [
  {
    id: 'PLkaliDemo01',
    title: 'Portfolio highlights',
    description: 'Demo playlist of portfolio walk-throughs and feature tours.',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    itemCount: 3,
    publishedAt: '2024-01-02T10:00:00Z',
    privacyStatus: 'public',
  },
  {
    id: 'PLkaliDemo02',
    title: 'Lab notebooks',
    description: 'Simulated lab captures and tooling explainers.',
    thumbnail: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
    itemCount: 2,
    publishedAt: '2024-02-05T12:30:00Z',
    privacyStatus: 'public',
  },
];

export const FALLBACK_YOUTUBE_CHANNEL: YouTubeChannelSummary = {
  id: 'UCxPIJ3hw6AOwomUWh5B7SfQ',
  title: 'Alex Unnippillil (demo)',
  thumbnail: '',
};

export const FALLBACK_YOUTUBE_DIRECTORY: YouTubePlaylistDirectory = {
  playlists: playlistSummaries,
  sections: [
    {
      sectionId: 'demo',
      sectionTitle: 'Demo playlists',
      playlists: playlistSummaries,
    },
  ],
};

export const FALLBACK_YOUTUBE_PLAYLIST_ITEMS: Record<string, YouTubePlaylistVideo[]> = {
  PLkaliDemo01: [
    {
      videoId: 'dQw4w9WgXcQ',
      title: 'Portfolio tour: Kali desktop overview',
      description: 'Walk through the desktop shell, apps, and workflow.',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
      publishedAt: '2024-01-02T10:00:00Z',
      position: 0,
    },
    {
      videoId: '3JZ_D3ELwOQ',
      title: 'Weather & widgets deep dive',
      description: 'Showcase of the weather dashboard and widget stack.',
      thumbnail: 'https://i.ytimg.com/vi/3JZ_D3ELwOQ/hqdefault.jpg',
      publishedAt: '2024-01-10T11:00:00Z',
      position: 1,
    },
    {
      videoId: 'e-ORhEE9VVg',
      title: 'Security lab highlights',
      description: 'Highlights from simulated tooling and reporting.',
      thumbnail: 'https://i.ytimg.com/vi/e-ORhEE9VVg/hqdefault.jpg',
      publishedAt: '2024-01-18T15:00:00Z',
      position: 2,
    },
  ],
  PLkaliDemo02: [
    {
      videoId: '9bZkp7q19f0',
      title: 'Incident response journal',
      description: 'A mock incident response workflow recap.',
      thumbnail: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg',
      publishedAt: '2024-02-05T12:30:00Z',
      position: 0,
    },
    {
      videoId: 'JGwWNGJdvx8',
      title: 'Packet lab recap',
      description: 'Replay of network lab notes and tooling usage.',
      thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
      publishedAt: '2024-02-12T09:15:00Z',
      position: 1,
    },
  ],
};
