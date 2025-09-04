import React, { useEffect, useState, useRef } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';

interface Video {
  id: string;
  title: string;
}

const CHANNEL_ID = 'UCVuVDVmnoVuCS27U5rRsI_g'; // Kali Linux Official channel

const VideoGallery: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`);
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'application/xml');
        const entries = Array.from(xml.getElementsByTagName('entry'));
        const vids: Video[] = entries.map((entry) => ({
          id: entry.getElementsByTagName('yt:videoId')[0]?.textContent || '',
          title: entry.getElementsByTagName('title')[0]?.textContent || '',
        }));
        setVideos(vids);
      } catch (e) {
        /* ignore errors */
      }
    };
    fetchVideos();
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      setWidth(listRef.current?.clientWidth || window.innerWidth);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const filtered = videos.filter((v) =>
    v.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="p-4">
      <input
        type="text"
        placeholder="Search videos..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-4 w-full max-w-md px-4 py-2 border rounded"
      />
      {playing && (
        <div className="mb-4 w-full max-w-2xl aspect-video">
          <iframe
            title="Selected video"
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${playing}`}
            sandbox="allow-scripts allow-popups"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="no-referrer"
            allowFullScreen
          />
        </div>
      )}
      <div ref={listRef} className="w-full">
        {width > 0 && (
          <List
            height={600}
            itemCount={filtered.length}
            itemSize={200}
            width={width}
          >
            {({ index, style }: ListChildComponentProps) => {
              const video = filtered[index];
              return (
                <div style={style} key={video.id} className="p-2">
                  <button
                    type="button"
                    className="text-left w-full rounded outline outline-2 outline-offset-2 outline-transparent hover:outline-blue-500 focus-visible:outline-blue-500"
                    onClick={() => setPlaying(video.id)}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                      alt={video.title}
                      className="w-full"
                      loading="lazy"
                    />
                    <p className="mt-2 text-sm" style={{ maxInlineSize: '60ch' }}>{video.title}</p>
                  </button>
                </div>
              );
            }}
          </List>
        )}
      </div>
    </main>
  );
};

export default VideoGallery;

