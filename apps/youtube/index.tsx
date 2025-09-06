'use client';

import Head from 'next/head';
import YouTubeApp from '../../components/apps/youtube';

export default function YouTubePage() {
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
      </Head>
      <div className="h-full w-full bg-ub-dark-grey font-sans text-ubt-cool-grey">
        <YouTubeApp />
      </div>
    </>
  );
}
