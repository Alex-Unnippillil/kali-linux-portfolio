import React, { useEffect, useState } from 'react';

export default function TweetEmbed({ id }) {
  const [html, setHtml] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setHtml(null);
    setError(false);

    fetch(`https://cdn.syndication.twimg.com/widgets/tweet?id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        if (active) {
          setHtml(data?.html || null);
        }
      })
      .catch(() => active && setError(true));

    return () => {
      active = false;
    };
  }, [id]);

  if (error) {
    return <div className="p-4 text-center">Unable to load tweet.</div>;
  }

  if (!html) {
    return (
      <div
        className="h-48 bg-gray-700 rounded motion-safe:animate-pulse"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className="tweet-embed"
      dangerouslySetInnerHTML={{ __html: html }}
      suppressHydrationWarning
    />
  );
}
