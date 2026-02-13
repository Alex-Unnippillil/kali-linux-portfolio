import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';

export default function TweetEmbed({ id }) {
  const [html, setHtml] = useState(null);
  const [error, setError] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [embedHeight, setEmbedHeight] = useState(null);
  const embedRef = useRef(null);

  useEffect(() => {
    let active = true;
    setHtml(null);
    setError(false);
    setMetadata(null);
    setEmbedHeight(null);

    const defaultMetadata = {
      authorName: 'Twitter user',
      authorHandle: '',
      profileImage: '',
      tweetUrl: `https://twitter.com/i/web/status/${id}`,
    };

    fetch(`https://cdn.syndication.twimg.com/widgets/tweet?id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        if (active) {
          const user = data?.user || {};
          const authorUrl = data?.author_url;
          const handleFromUrl = (() => {
            if (typeof authorUrl !== 'string' || !authorUrl.includes('twitter.com')) {
              return '';
            }

            const [, maybeHandle = ''] = authorUrl.split('twitter.com/');
            const cleanedHandle = maybeHandle.split('/')[0]?.trim();
            return cleanedHandle ? `@${cleanedHandle.replace(/^@/, '')}` : '';
          })();
          const computedMetadata = {
            authorName: user.name || data?.author_name || defaultMetadata.authorName,
            authorHandle:
              (user.screen_name && `@${user.screen_name}`) || handleFromUrl || defaultMetadata.authorHandle,
            profileImage:
              user.profile_image_url_https ||
              user.profile_image_url ||
              data?.profile_image_url_https ||
              data?.profile_image_url ||
              defaultMetadata.profileImage,
            tweetUrl:
              data?.url ||
              (authorUrl ? `${authorUrl}/status/${id}` : defaultMetadata.tweetUrl),
          };

          setMetadata(computedMetadata);

          if (data?.height) {
            const numericHeight = Number(data.height);
            if (!Number.isNaN(numericHeight) && numericHeight > 0) {
              setEmbedHeight(numericHeight);
            }
          }

          if (data?.errors?.length) {
            setError(true);
            setHtml(null);
            return;
          }

          const sanitized = DOMPurify.sanitize(data?.html || '');
          if (!sanitized) {
            setError(true);
            setHtml(null);
            return;
          }

          setHtml(sanitized);
        }
      })
      .catch(() => {
        if (active) {
          setMetadata((prev) => prev || defaultMetadata);
          setError(true);
        }
      });

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

  useEffect(() => {
    if (!html || error) return;

    let isCancelled = false;
    let fallbackTimer = null;
    let checkTimer = null;

    const node = embedRef.current;
    if (!node) return undefined;

    const ensureWidgets = () => {
      if (typeof window === 'undefined') {
        return Promise.reject();
      }

      if (window.twttr?.widgets) {
        return Promise.resolve(window.twttr);
      }

      const existingScript = document.querySelector('script[data-twitter-widgets]');
      if (existingScript) {
        return new Promise((resolve, reject) => {
          existingScript.addEventListener('load', () => resolve(window.twttr), { once: true });
          existingScript.addEventListener('error', reject, { once: true });
        });
      }

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        script.defer = true;
        script.dataset.twitterWidgets = 'true';
        script.onload = () => resolve(window.twttr);
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    ensureWidgets()
      .then((twttr) => {
        if (!twttr || isCancelled) return;
        twttr.widgets?.load(node);

        const hasIframe = () => Boolean(node.querySelector('iframe'));

        checkTimer = window.setInterval(() => {
          if (isCancelled) return;
          if (hasIframe()) {
            window.clearInterval(checkTimer);
            window.clearTimeout(fallbackTimer);
          }
        }, 250);

        fallbackTimer = window.setTimeout(() => {
          if (isCancelled) return;
          window.clearInterval(checkTimer);
          if (!hasIframe()) {
            setHtml(null);
            setError(true);
          }
        }, 4000);
      })
      .catch(() => {
        if (!isCancelled) {
          setHtml(null);
          setError(true);
        }
      });

    return () => {
      isCancelled = true;
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (checkTimer) window.clearInterval(checkTimer);
    };
  }, [html, error]);

  if (error) {
    const minHeight = embedHeight ? `${embedHeight}px` : '12rem';
    const fallbackId = `tweet-fallback-${id}`;
    const fallbackMetadata =
      metadata || {
        authorName: 'Twitter user',
        authorHandle: '',
        profileImage: '',
        tweetUrl: `https://twitter.com/i/web/status/${id}`,
      };

    return (
      <div
        className="flex flex-col justify-between rounded border border-gray-600 bg-gray-800 p-4 text-gray-200"
        style={{ minHeight }}
        role="group"
        aria-labelledby={fallbackId}
      >
        <p id={fallbackId} className="sr-only">
          Twitter content is unavailable to display inline. Use the link below to open the tweet on Twitter.
        </p>
        <div className="flex items-center gap-3">
          {fallbackMetadata.profileImage ? (
            <img
              src={fallbackMetadata.profileImage}
              alt={`Profile image for ${fallbackMetadata.authorName || 'Twitter user'}`}
              className="h-12 w-12 rounded-full object-cover"
              loading="lazy"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-lg font-semibold"
              aria-hidden="true"
            >
              X
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-100">{fallbackMetadata.authorName || 'Twitter user'}</span>
            {fallbackMetadata.authorHandle ? (
              <span className="text-sm text-gray-400">{fallbackMetadata.authorHandle}</span>
            ) : null}
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-300">
          This tweet cannot be displayed here because the embed was blocked or failed to load.
        </div>
        <a
          className="mt-4 inline-flex items-center justify-center rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
          href={fallbackMetadata.tweetUrl || `https://twitter.com/i/web/status/${id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View this tweet on Twitter
        </a>
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
        ref={embedRef}
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
