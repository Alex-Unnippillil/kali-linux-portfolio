import React, { useState } from 'react';
import EmbedPlaceholder from './EmbedPlaceholder';

interface SpotifyEmbedProps extends Omit<React.IframeHTMLAttributes<HTMLIFrameElement>, 'title' | 'height'> {
  playlistId: string;
  title?: string;
  height?: number;
  theme?: '0' | '1';
  allowLabel?: string;
  description?: string;
  className?: string;
  onAllow?: () => void;
}

const SpotifyEmbed = React.forwardRef<HTMLIFrameElement, SpotifyEmbedProps>(
  (
    {
      playlistId,
      title = 'Spotify player',
      height = 152,
      theme = '0',
      allowLabel,
      description,
      className,
      onAllow,
      ...iframeProps
    },
    ref,
  ) => {
    const [allowed, setAllowed] = useState(false);
    const containerClass = ['relative w-full', className]
      .filter(Boolean)
      .join(' ');

    const handleAllow = () => {
      setAllowed(true);
      onAllow?.();
    };

    return (
      <div className={containerClass} style={{ minHeight: height }}>
        {allowed ? (
          <iframe
            ref={ref}
            src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=${theme}`}
            title={title}
            width="100%"
            height={height}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            {...iframeProps}
          />
        ) : (
          <EmbedPlaceholder
            className="absolute inset-0"
            service="Spotify"
            description={
              description ??
              'Loading this player connects to Spotify and may set cookies or track playback.'
            }
            allowLabel={allowLabel ?? 'Enable Spotify'}
            onAllow={handleAllow}
          />
        )}
      </div>
    );
  },
);

SpotifyEmbed.displayName = 'SpotifyEmbed';

export default SpotifyEmbed;
