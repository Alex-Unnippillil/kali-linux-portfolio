'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically load the timeline widget on the client only.
const TwitterTimelineEmbed = dynamic(
  () => import('react-twitter-embed').then((mod) => mod.TwitterTimelineEmbed),
  { ssr: false }
);

export default function XApp() {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey">
      <div className="p-2 border-b border-gray-600 flex justify-end">
        <button
          onClick={toggleTheme}
          className="px-4 py-1 bg-blue-500 text-white rounded"
        >
          {theme === 'light' ? 'Dark' : 'Light'} Mode
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <TwitterTimelineEmbed
          key={theme}
          sourceType="profile"
          screenName="AUnnippillil"
          options={{ chrome: 'noheader noborders', theme }}
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

