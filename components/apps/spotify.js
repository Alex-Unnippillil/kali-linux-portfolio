import React from 'react';
import { TwitterTimelineEmbed } from 'react-twitter-embed';

export default function XApp() {
  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey">
      <TwitterTimelineEmbed
        sourceType="profile"
        screenName="AUnnippillil"
        noHeader
        noBorders
        options={{ height: 600 }}
      />
    </div>
  );
}

export const displayX = () => <XApp />;

