'use client';

import YouTubeApp from '../../components/apps/youtube';

const YOUTUBE_NOCOOKIE_HOST = 'https://www.youtube-nocookie.com';

export default function YouTubePage() {
  return (
    <div className="h-full w-full bg-ub-dark-grey font-sans text-ubt-cool-grey">
      <YouTubeApp embedHost={YOUTUBE_NOCOOKIE_HOST} />
    </div>
  );
}
