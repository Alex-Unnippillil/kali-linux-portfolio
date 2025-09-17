import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import EmbedPlaceholder from './EmbedPlaceholder';

interface TweetEmbedProps {
  id: string;
  className?: string;
  description?: string;
  allowLabel?: string;
}

const TweetEmbed: React.FC<TweetEmbedProps> = ({
  id,
  className,
  description,
  allowLabel,
}) => {
  const [allowed, setAllowed] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const hook = (node: Element) => {
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
    if (!allowed) return;
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
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, [id, allowed]);

  if (!allowed) {
    return (
      <div className={['relative', className].filter(Boolean).join(' ')}>
        <EmbedPlaceholder
          className="absolute inset-0"
          service="X (Twitter)"
          description={
            description ??
            'Viewing this post contacts X (Twitter) and may load cookies or trackers. Click allow to continue.'
          }
          allowLabel={allowLabel ?? 'Load post'}
          onAllow={() => setAllowed(true)}
        />
      </div>
    );
  }

  if (error) {
    return <div className={className}>Unable to load tweet.</div>;
  }

  if (!html) {
    return (
      <div className={['relative', className].filter(Boolean).join(' ')}>
        <div
          className="absolute inset-0 rounded bg-gray-700 motion-safe:animate-pulse"
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className={className}>
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
    </div>
  );
};

export default TweetEmbed;
