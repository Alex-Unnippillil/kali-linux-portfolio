import React from 'react';
import dynamic from 'next/dynamic';

// Load the Twitter embed only on the client to avoid SSR issues.
const TwitterTimelineEmbed = dynamic(
  () => import('react-twitter-embed').then((mod) => mod.TwitterTimelineEmbed),
  { ssr: false }
);

export default function XApp() {
  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey">
      <TwitterTimelineEmbed
        sourceType="profile"
        screenName="aunnippillil"
        options={{ chrome: 'noheader noborders' }}
        className="w-full h-full"
      />
    </div>
  );
}

export const displayX = () => <XApp />;

