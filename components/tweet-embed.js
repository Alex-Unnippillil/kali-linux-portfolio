import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

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
          const sanitized = DOMPurify.sanitize(data?.html || '');
          setHtml(sanitized);
        }
      })
      .catch(() => active && setError(true));

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const hook = (node) => {
      if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    };
    DOMPurify.addHook('afterSanitizeAttributes', hook);
    return () => {
      DOMPurify.removeHook('afterSanitizeAttributes', hook);
    };
  }, []);

  if (error) {
    return <div className="p-4 text-center">Unable to load tweet.</div>;
  }

  const tweetUrl = `https://x.com/i/web/status/${id}`;

  if (!html) {
    return (
      <div
        className="h-48 bg-gray-700 rounded motion-safe:animate-pulse"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="tweet-embed-container">
      <div
        className="tweet-embed"
        dangerouslySetInnerHTML={{ __html: html }}
        suppressHydrationWarning
      />
      <a
        className="tweet-embed__cta"
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open in X
      </a>
      <style jsx>{`
        .tweet-embed-container {
          max-width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          align-items: stretch;
        }

        .tweet-embed {
          max-width: 100%;
          overflow-x: hidden;
        }

        .tweet-embed :global(blockquote.twitter-tweet) {
          margin: 0 auto;
          max-width: 100%;
        }

        .tweet-embed :global(blockquote.twitter-tweet iframe),
        .tweet-embed :global(blockquote.twitter-tweet p),
        .tweet-embed :global(blockquote.twitter-tweet a) {
          max-width: 100%;
        }

        .tweet-embed svg {
          width: 20px;
          height: 20px;
          margin: 0 0.25rem;
        }

        .tweet-embed__cta {
          align-self: flex-start;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          background: rgba(255, 255, 255, 0.08);
          color: inherit;
          text-decoration: none;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        .tweet-embed__cta:hover,
        .tweet-embed__cta:focus-visible {
          background: rgba(255, 255, 255, 0.16);
        }

        @media (max-width: 600px) {
          .tweet-embed {
            padding-right: 0.5rem;
          }

          .tweet-embed-container {
            overflow-x: hidden;
          }
        }
      `}</style>
    </div>
  );
}
