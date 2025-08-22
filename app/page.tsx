import XTimeline from './components/XTimeline';
import React from 'react';

export default function HomePage() {
  return (
    <main className="p-4">
      <XTimeline username="aunnippillil" theme="light" height={700} />
    </main>
  );
}
