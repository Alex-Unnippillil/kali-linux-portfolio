import React, { useState, useEffect } from 'react';
import YouTubePlayer from './YouTubePlayer';

interface Video {
  id: string;
  title: string;
}

const DEFAULT_MOCK: Video[] = [
  { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up' },
  { id: 'M7lc1UVf-VE', title: 'YouTube API Demo' },
];

export default function YouTubeSearch({ mockData = DEFAULT_MOCK }: { mockData?: Video[] }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Video[]>([]);
  const [recent, setRecent] = useState<Video[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('recentlyWatched') || '[]');
      if (Array.isArray(stored)) setRecent(stored);
    } catch {
      // ignore
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(
            query
          )}&key=${apiKey}`
        );
        const data = await res.json();
        const items: Video[] =
          data.items?.map((i: any) => ({
            id: i.id.videoId,
            title: i.snippet.title,
          })) || [];
        setResults(items);
      } catch {
        setResults([]);
      }
    } else {
      const filtered = mockData.filter((v) =>
        v.title.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    }
  };

  const addRecent = (video: Video) => {
    const updated = [video, ...recent.filter((v) => v.id !== video.id)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem('recentlyWatched', JSON.stringify(updated));
  };

  return (
    <div className="p-4">
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search YouTube"
          className="flex-1 px-2 py-1 text-black rounded"
        />
        <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded">
          Search
        </button>
      </form>

      {results.length > 0 && (
        <div className="space-y-6">
          {results.map((v) => (
            <div key={v.id}>
              <p className="mb-2 font-semibold">{v.title}</p>
              <YouTubePlayer videoId={v.id} onPlay={() => addRecent(v)} />
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-2">Recently watched</h2>
          <ul data-testid="recent-list" className="list-disc pl-5">
            {recent.map((v) => (
              <li key={v.id}>{v.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

