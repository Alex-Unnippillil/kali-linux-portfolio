import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { useSettings } from '../hooks/useSettings';

export default function TweetEmbed({ id }) {
  const [html, setHtml] = useState(null);
  const [error, setError] = useState(false);
  const [allowOnce, setAllowOnce] = useState(false);
  const { allowEmbeds, setAllowEmbeds } = useSettings();
  const hasConsent = allowEmbeds || allowOnce;

  useEffect(() => {
    if (!hasConsent) {
      setHtml(null);
      setError(false);
      return undefined;
    }
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
  }, [id, hasConsent]);

  useEffect(() => {
    if (!hasConsent) return undefined;
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
  }, [hasConsent]);

  useEffect(() => {
    setAllowOnce(false);
  }, [id]);

  useEffect(() => {
    if (!allowEmbeds) {
      setAllowOnce(false);
    }
  }, [allowEmbeds]);

  if (error) {
    return <div className="p-4 text-center">Unable to load tweet.</div>;
  }

  if (!hasConsent) {
    return (
      <div className="rounded border border-ubt-cool-grey bg-ub-cool-grey/40 p-4 text-sm text-ubt-grey">
        <p className="mb-3 font-medium">Embedded tweet blocked</p>
        <p className="mb-4">
          Tweets load third-party scripts. Enable embeds to view this content or load it once for this session.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-ub-orange px-3 py-1 text-black transition hover:bg-ub-orange/80"
            onClick={() => setAllowEmbeds(true)}
          >
            Always allow embeds
          </button>
          <button
            type="button"
            className="rounded border border-ubt-grey px-3 py-1 text-ubt-grey transition hover:bg-ub-grey/60"
            onClick={() => setAllowOnce(true)}
          >
            Load once
          </button>
        </div>
      </div>
    );
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
        dangerouslySetInnerHTML={{ __html: html }}
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
