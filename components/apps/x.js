import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Load the Twitter embed only on the client to avoid SSR issues.
const TwitterTimelineEmbed = dynamic(
  () => import('react-twitter-embed').then((mod) => mod.TwitterTimelineEmbed),
  { ssr: false }
);

export default function XApp() {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // If the embed does not load within a few seconds, display a fallback link.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loaded) setFailed(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [loaded]);

  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey">
      {!failed ? (
        <TwitterTimelineEmbed
          sourceType="profile"
          screenName="alexunnippillil"
          options={{ chrome: 'noheader noborders' }}
          className="w-full h-full"
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-4 text-center text-white">
          Unable to load timeline. Visit{' '}
          <a
            href="https://x.com/alexunnippillil"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            x.com/alexunnippillil
          </a>
          .
        </div>
      )}
    </div>
  );
}

export const displayX = () => <XApp />;

