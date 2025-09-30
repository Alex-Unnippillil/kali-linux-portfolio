import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';

export default function TweetEmbed({ id }) {
  const [html, setHtml] = useState(null);
  const [error, setError] = useState(false);
  const tweetUrl = `https://twitter.com/i/web/status/${id}`;

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
    return (
      <div className="tweet-embed-shell">
        <div className="tweet-embed-container">
          <div className="tweet-embed-fallback">Unable to load tweet.</div>
        </div>
        <a
          className="tweet-embed-link"
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open in X
        </a>
        <style jsx>{styles}</style>
      </div>
    );
  }

  if (!html) {
    return (
      <div className="tweet-embed-shell">
        <div className="tweet-embed-container">
          <div className="tweet-embed-placeholder" aria-hidden="true" />
        </div>
        <style jsx>{styles}</style>
      </div>
    );
  }

  return (
    <div className="tweet-embed-shell">
      <div className="tweet-embed-container">
        <div
          className="tweet-embed"
          dangerouslySetInnerHTML={{ __html: html }}
          suppressHydrationWarning
        />
      </div>
      <a
        className="tweet-embed-link"
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open in X
      </a>
      <style jsx>{styles}</style>
    </div>
  );
}

const styles = `
  .tweet-embed-shell {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    overflow-x: hidden;
  }

  .tweet-embed-container {
    width: 100%;
    max-width: 36rem;
  }

  @keyframes tweet-embed-pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  .tweet-embed-placeholder {
    height: 12rem;
    border-radius: 0.75rem;
    background-color: rgb(55 65 81);
    animation: tweet-embed-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .tweet-embed-placeholder {
      animation: none;
    }
  }

  .tweet-embed-fallback {
    width: 100%;
    border-radius: 0.75rem;
    background-color: rgba(31, 41, 55, 0.75);
    border: 1px dashed rgba(148, 163, 184, 0.4);
    padding: 1rem;
    text-align: center;
  }

  .tweet-embed-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 9999px;
    padding: 0.5rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: rgb(191, 219, 254);
    border: 1px solid rgba(56, 189, 248, 0.6);
    transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
  }

  .tweet-embed-link:hover,
  .tweet-embed-link:focus-visible {
    background-color: rgba(56, 189, 248, 0.15);
    color: rgb(224, 242, 254);
    border-color: rgba(56, 189, 248, 0.9);
  }

  .tweet-embed svg {
    width: 20px;
    height: 20px;
    margin: 0 0.25rem;
  }

  .tweet-embed-container :global(blockquote.twitter-tweet),
  .tweet-embed-container :global(.twitter-tweet-rendered) {
    margin: 0 auto !important;
    max-width: 100% !important;
  }

  .tweet-embed-container :global(iframe) {
    max-width: 100% !important;
  }

  .tweet-embed-container :global(.twitter-tweet-rendered) {
    overflow-x: hidden !important;
  }
`;
