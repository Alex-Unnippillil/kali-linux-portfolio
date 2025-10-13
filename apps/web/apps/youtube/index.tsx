'use client';

import YouTubeApp from '../../components/apps/youtube';
import { demoYouTubeVideos } from '../../data/youtube/demoVideos';

export default function YouTubePage() {
  return (
    <div className="h-full w-full bg-ub-dark-grey font-sans text-ubt-cool-grey">
      <YouTubeApp initialResults={demoYouTubeVideos} />
    </div>
  );
}
