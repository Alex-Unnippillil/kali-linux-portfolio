import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { createTrustedHTML } from '../utils/trustedTypes';

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

  if (!html) {
    return (
      <div
        className="h-48 bg-gray-700 rounded motion-safe:animate-pulse"
        aria-hidden="true"
      />
    );
  }

  return (
    <>
      <div
        className="tweet-embed"
        dangerouslySetInnerHTML={{ __html: createTrustedHTML(html) }}
        suppressHydrationWarning
      />
      <style jsx>{`
        .tweet-embed svg {
          width: 20px;
          height: 20px;
          margin: 0 0.25rem;
        }
      `}</style>
    </>
  );
}
