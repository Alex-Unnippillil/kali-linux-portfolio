import React from 'react';
import dynamic from 'next/dynamic';

// Load the Twitter timeline only on the client to avoid SSR issues.
const Timeline = dynamic(
  () => import('react-twitter-widgets').then((mod) => mod.Timeline),
  { ssr: false }
);

export default function XApp() {
  return (
    <div className="h-full w-full overflow-auto bg-panel">
      <Timeline
        dataSource={{ sourceType: 'profile', screenName: 'AUnnippillil' }}
        options={{ chrome: 'noheader noborders', theme: 'dark' }}
      />
    </div>
  );
}

export const displayX = () => <XApp />;

