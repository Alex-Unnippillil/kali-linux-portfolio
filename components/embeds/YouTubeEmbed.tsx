import React, { useState } from 'react';
import EmbedPlaceholder from './EmbedPlaceholder';

interface YouTubeEmbedProps {
  videoId: string;
  title?: string;
  aspectRatio?: string;
  allowLabel?: string;
  description?: string;
  className?: string;
}

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({
  videoId,
  title = 'YouTube video',
  aspectRatio = '16 / 9',
  allowLabel,
  description,
  className,
}) => {
  const [allowed, setAllowed] = useState(false);
  const containerClass = [
    'relative w-full overflow-hidden rounded bg-black',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass} style={{ aspectRatio }}>
      {allowed ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
          sandbox="allow-scripts allow-same-origin allow-popups"
          referrerPolicy="no-referrer"
        />
      ) : (
        <EmbedPlaceholder
          className="absolute inset-0"
          service="YouTube"
          description={
            description ??
            'Playing this video loads content from YouTube, which may set cookies or collect viewing data.'
          }
          allowLabel={allowLabel ?? 'Load video'}
          onAllow={() => setAllowed(true)}
        />
      )}
    </div>
  );
};

export default YouTubeEmbed;
