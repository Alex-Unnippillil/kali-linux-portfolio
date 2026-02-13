import React, { useEffect, useRef, useState } from 'react';

const TWITTER_WIDGET_SRC = 'https://platform.twitter.com/widgets.js';

export default function TweetEmbed({ id }) {
  const containerRef = useRef(null);
  const [loadRequest, setLoadRequest] = useState(0);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const tweetUrl = `https://twitter.com/i/web/status/${id}`;

  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current || loadRequest > 0) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setLoadRequest(1);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setLoadRequest((count) => (count === 0 ? 1 : count));
        }
      });
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loadRequest]);

  useEffect(() => {
    if (loadRequest === 0 || typeof window === 'undefined' || !containerRef.current) {
      return undefined;
    }

    setLoadError(false);
    setHasHydrated(false);

    let cancelled = false;
    let scriptElement;

    const hydrate = () => {
      if (cancelled) return;
      if (window?.twttr?.widgets?.load) {
        window.twttr.widgets.load(containerRef.current);
        setHasHydrated(true);
      }
    };

    const handleError = () => {
      if (!cancelled) {
        setLoadError(true);
        if (scriptElement) {
          scriptElement.dataset.twitterWidgetsError = 'true';
          scriptElement.removeEventListener('load', hydrate);
          scriptElement.removeEventListener('error', handleError);
          scriptElement.remove();
        }
      }
    };

    let existingScript = document.querySelector(
      `script[src="${TWITTER_WIDGET_SRC}"]`
    );

    if (existingScript?.dataset?.twitterWidgetsError === 'true') {
      existingScript.remove();
      existingScript = null;
    }

    if (existingScript) {
      scriptElement = existingScript;
      if (window?.twttr?.widgets) {
        hydrate();
      } else {
        scriptElement.addEventListener('load', hydrate);
        scriptElement.addEventListener('error', handleError);
      }

      return () => {
        cancelled = true;
        scriptElement.removeEventListener('load', hydrate);
        scriptElement.removeEventListener('error', handleError);
      };
    }

    scriptElement = document.createElement('script');
    scriptElement.src = TWITTER_WIDGET_SRC;
    scriptElement.async = true;
    scriptElement.addEventListener('load', hydrate);
    scriptElement.addEventListener('error', handleError);
    document.body.appendChild(scriptElement);

    return () => {
      cancelled = true;
      scriptElement.removeEventListener('load', hydrate);
      scriptElement.removeEventListener('error', handleError);
    };
  }, [loadRequest]);

  const requestLoad = () => {
    if (hasHydrated) {
      return;
    }
    setLoadError(false);
    setLoadRequest((count) => count + 1);
  };

  return (
    <>
      <div
        ref={containerRef}
        className="tweet-embed__container"
        onClick={requestLoad}
        onKeyDown={(event) => {
          if (hasHydrated) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            requestLoad();
          }
        }}
        role="region"
        aria-label="Embedded Tweet"
        aria-busy={!hasHydrated && !loadError}
        tabIndex={hasHydrated ? -1 : 0}
      >
        <blockquote className="twitter-tweet" data-dnt="true">
          <p>View this tweet on Twitter.</p>
          <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
            {tweetUrl}
          </a>
        </blockquote>
        {!hasHydrated && (
          <button
            type="button"
            className="tweet-embed__cta"
            onClick={(event) => {
              event.stopPropagation();
              requestLoad();
            }}
          >
            {loadError ? 'Try loading again' : 'Load embedded tweet'}
          </button>
        )}
        {loadError && (
          <p className="tweet-embed__error">Unable to load embedded tweet.</p>
        )}
      </div>
      <noscript>
        <p className="tweet-embed__noscript">
          View this tweet on Twitter:{' '}
          <a href={tweetUrl} rel="noopener noreferrer" target="_blank">
            {tweetUrl}
          </a>
        </p>
      </noscript>
      <style jsx>{`
        .tweet-embed__container {
          position: relative;
          min-height: 18rem;
          padding: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 0.75rem;
          background: rgba(17, 24, 39, 0.6);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.75rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .tweet-embed__container:focus-visible {
          outline: none;
          border-color: rgba(59, 130, 246, 0.9);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4);
        }

        .twitter-tweet {
          margin: 0;
          color: inherit;
        }

        .twitter-tweet a {
          color: #60a5fa;
          word-break: break-all;
        }

        .tweet-embed__cta {
          align-self: flex-start;
          padding: 0.4rem 0.75rem;
          border-radius: 9999px;
          background: rgba(59, 130, 246, 0.15);
          color: #bfdbfe;
          border: 1px solid rgba(59, 130, 246, 0.4);
          font-size: 0.85rem;
          line-height: 1.2;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease,
            color 0.2s ease;
        }

        .tweet-embed__cta:hover,
        .tweet-embed__cta:focus-visible {
          outline: none;
          background: rgba(59, 130, 246, 0.25);
          border-color: rgba(59, 130, 246, 0.7);
          color: #e0f2fe;
        }

        .tweet-embed__error {
          margin: 0;
          color: #fca5a5;
        }

        .tweet-embed__noscript {
          margin-top: 0.5rem;
        }
      `}</style>
    </>
  );
}
