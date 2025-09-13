import React, { useEffect, useState } from 'react';

interface NewsItem {
  title: string;
  url: string;
}

const truncate = (text: string, length = 80) =>
  text.length > length ? `${text.slice(0, length - 1)}…` : text;

const NewsStrip: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    let mounted = true;
    fetch('/data/news.json')
      .then((res) => res.json())
      .then((data: NewsItem[]) => {
        if (mounted) setItems(data);
      })
      .catch(() => setItems([]));
    return () => {
      mounted = false;
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="bg-gray-800 text-sm text-gray-100">
      <ul className="flex overflow-x-auto space-x-4 p-2">
        {items.map((item) => (
          <li key={item.url}>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {truncate(item.title)}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NewsStrip;
