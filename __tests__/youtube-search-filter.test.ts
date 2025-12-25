import { filterDirectoryBySearch, type PlaylistListing, type PlaylistItemsState } from '../components/apps/youtube';

const basePlaylist: PlaylistListing = {
  sectionId: 'featured',
  sectionTitle: 'Featured',
  playlists: [
    {
      id: 'playlist-a',
      title: 'Red team essentials',
      description: 'Offensive security walkthroughs',
      thumbnail: '',
      itemCount: 10,
      publishedAt: '',
      privacyStatus: 'public',
    },
    {
      id: 'playlist-b',
      title: 'Blue team drills',
      description: 'Defensive techniques',
      thumbnail: '',
      itemCount: 8,
      publishedAt: '',
      privacyStatus: 'public',
    },
  ],
};

const itemsState: Record<string, PlaylistItemsState> = {
  'playlist-b': {
    items: [
      {
        videoId: 'vid-123',
        title: 'Incident response lab',
        description: 'Hands-on DFIR walkthrough',
        thumbnail: '',
        publishedAt: '',
        position: 0,
      },
    ],
    loading: false,
  },
};

describe('filterDirectoryBySearch', () => {
  it('returns the original directory when no search term is provided', () => {
    const result = filterDirectoryBySearch([basePlaylist], '', itemsState);
    expect(result).toEqual([basePlaylist]);
  });

  it('matches playlists by metadata', () => {
    const result = filterDirectoryBySearch([basePlaylist], 'red team', itemsState);
    expect(result).toHaveLength(1);
    expect(result[0]?.playlists.map((p) => p.id)).toEqual(['playlist-a']);
  });

  it('matches playlists when any loaded video matches the search term', () => {
    const result = filterDirectoryBySearch([basePlaylist], 'incident response', itemsState);
    expect(result).toHaveLength(1);
    expect(result[0]?.playlists.map((p) => p.id)).toEqual(['playlist-b']);
  });
});

