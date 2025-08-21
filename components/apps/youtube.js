import React, { useEffect, useState } from 'react';

const CHANNEL_HANDLE = 'Alex-Unnippillil';

export default function YouTubeApp({ initialVideos = [] }) {
  const [videos, setVideos] = useState(initialVideos);
  const [sortBy, setSortBy] = useState('date');
  const [selectedPlaylist, setSelectedPlaylist] = useState('All');
  const [search, setSearch] = useState('');
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  useEffect(() => {
    if (!apiKey || initialVideos.length) return;

    async function fetchData() {
      try {
        const channelRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${CHANNEL_HANDLE}&key=${apiKey}`
        );
        const channelData = await channelRes.json();
        const channelId = channelData.items?.[0]?.id;
        if (!channelId) return;

        const playlistsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&maxResults=50&key=${apiKey}`
        );
        const playlistsData = await playlistsRes.json();
        const playlists = playlistsData.items || [];

        const favoritesId = `LL${channelId}`; // Liked videos playlist
        const playlistInfos = [
          ...playlists.map((p) => ({ id: p.id, title: p.snippet.title })),
          { id: favoritesId, title: 'Favorites' },
        ];

        const allVideos = [];
        for (const pl of playlistInfos) {
          const plRes = await fetch(
            `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${pl.id}&maxResults=50&key=${apiKey}`
          );
          const plData = await plRes.json();
          plData.items?.forEach((item) => {
            allVideos.push({
              id: item.snippet.resourceId.videoId,
              title: item.snippet.title,
              playlist: pl.title,
              publishedAt: item.snippet.publishedAt,
              thumbnail: item.snippet.thumbnails?.default?.url,
              url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
            });
          });
        }
        setVideos(allVideos);
      } catch (err) {
        console.error('Failed to load YouTube data', err);
      }
    }

    fetchData();
  }, [apiKey, initialVideos.length]);

  const playlists = ['All', ...new Set(videos.map((v) => v.playlist))];

  const filteredVideos = videos
    .filter(
      (v) => selectedPlaylist === 'All' || v.playlist === selectedPlaylist
    )
    .filter((v) => v.title.toLowerCase().includes(search.toLowerCase()));

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (sortBy === 'playlist') {
      return a.playlist.localeCompare(b.playlist);
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });

  if (!apiKey && videos.length === 0) {
    return (
      <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white p-2">
        <p>YouTube API key is not configured.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      <div className="p-2 flex flex-wrap items-center space-x-2 space-y-2">
        <input
          placeholder="Search..."
          className="text-black px-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label htmlFor="sort" className="self-center">
          Sort by:
        </label>
        <select
          id="sort"
          className="text-black"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="date">Date</option>
          <option value="playlist">Playlist</option>
          <option value="title">Title</option>
        </select>
      </div>
      <div className="p-2 flex space-x-2">
        {playlists.map((pl) => (
          <button
            key={pl}
            onClick={() => setSelectedPlaylist(pl)}
            className={`px-2 py-1 ${
              selectedPlaylist === pl ? 'bg-gray-700' : 'bg-gray-500'
            }`}
          >
            {pl}
          </button>
        ))}
      </div>
      <ul className="p-2 space-y-2">
        {sortedVideos.map((video) => (
          <li key={video.id} data-testid="video-card">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-400"
            >
              <img src={video.thumbnail} alt={video.title} />
              {video.title}
            </a>
            <div className="text-xs text-gray-300">
              {video.playlist} • {new Date(video.publishedAt).toLocaleDateString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const displayYouTube = () => <YouTubeApp />;

