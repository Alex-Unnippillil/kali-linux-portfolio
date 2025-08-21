import React, { useEffect, useState } from 'react';

const CHANNEL_HANDLE = 'Alex-Unnippillil';

export default function YouTubeApp() {
  const [videos, setVideos] = useState([]);
  const [playlistInfos, setPlaylistInfos] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('date');
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  useEffect(() => {
    if (!apiKey) return;

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
        const infos = [
          ...playlists.map((p) => ({ id: p.id, title: p.snippet.title })),
          { id: favoritesId, title: 'Favorites' },
        ];
        setPlaylistInfos(infos);

        const allVideos = [];
        for (const pl of infos) {
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
              url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
              thumbnail: item.snippet.thumbnails?.medium?.url,
              channelTitle: item.snippet.channelTitle,
            });
          });
        }
        setVideos(allVideos);
      } catch (err) {
        console.error('Failed to load YouTube data', err);
      }
    }

    fetchData();
  }, [apiKey]);


  const filteredVideos = videos.filter(
    (v) => activeCategory === 'All' || v.playlist === activeCategory
  );
  const sortedVideos = [...filteredVideos].sort((a, b) => {

  useEffect(() => {
    const handler = setTimeout(() => setQuery(inputValue), 300);
    return () => clearTimeout(handler);
  }, [inputValue]);

  const sortedVideos = [...videos].sort((a, b) => {
    switch (sortBy) {
      case 'playlist':
        return a.playlist.localeCompare(b.playlist);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'dateAsc':
        return new Date(a.publishedAt) - new Date(b.publishedAt);
      case 'date':
      default:
        return new Date(b.publishedAt) - new Date(a.publishedAt);


    if (sortBy === 'playlist') {
      return a.playlist.localeCompare(b.playlist);

    }
  });

  const filteredVideos = sortedVideos.filter((video) =>
    video.title.toLowerCase().includes(query.toLowerCase())
  );

  if (!apiKey) {
    return (
      <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white p-2">
        <p>YouTube API key is not configured.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      <div className="p-2 flex justify-end space-x-2">
        <label htmlFor="sort" className="self-center">
          Sort by:
        </label>
        <select
          id="sort"
          className="text-black"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="date">Newest First</option>
          <option value="dateAsc">Oldest First</option>
          <option value="title">Title (A-Z)</option>
          <option value="playlist">Playlist</option>
        </select>

      <div className="p-2 flex justify-between items-center space-x-2">
        <div className="flex-1 max-w-xs">
          <label htmlFor="youtube-search" className="sr-only">
            Search videos
          </label>
          <input
            id="youtube-search"
            type="text"
            placeholder="Search videos"
            className="w-full px-3 py-1 bg-black text-white border border-gray-600 rounded focus:outline-none"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
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
          </select>
        </div>
      </div>
      <div className="overflow-x-auto flex space-x-4 p-2">
        {['All', ...playlistInfos.map((p) => p.title)].map((title) => (
          <button
            key={title}
            onClick={() => setActiveCategory(title)}
            className={`whitespace-nowrap ${
              activeCategory === title ? 'font-bold underline' : ''
            }`}
          >
            {title}
          </button>
        ))}
      </div>
      <ul className="p-2 space-y-2">


      <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {sortedVideos.map((video) => (
          <a
            key={video.id}
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-ub-cool-grey hover:bg-ub-grey rounded overflow-hidden"
          >
            {video.thumbnail && (
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full rounded-t"
              />
            )}
            <div className="p-2">
              <h3 className="text-sm font-medium line-clamp-2">{video.title}</h3>
              <div className="text-xs text-gray-300">
                {video.channelTitle} • {new Date(video.publishedAt).toLocaleDateString()}
              </div>

      <ul className="p-2 space-y-2">
        {filteredVideos.map((video) => (
          <li key={video.id}>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-400"
            >
              {video.title}
            </a>
            <div className="text-xs text-gray-300">
              {video.playlist} • {new Date(video.publishedAt).toLocaleDateString()}

            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

export const displayYouTube = () => <YouTubeApp />;

