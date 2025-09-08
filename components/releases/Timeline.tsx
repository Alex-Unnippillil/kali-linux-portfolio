import React from 'react';

export interface ReleaseItem {
  title: string;
  link: string;
  pubDate: string;
}

interface TimelineProps {
  releases: ReleaseItem[];
}

const Timeline: React.FC<TimelineProps> = ({ releases }) => (
  <ol className="relative ml-4 border-l border-gray-700">
    {releases.map((release) => (
      <li key={release.link} className="mb-10 ml-4">
        <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border border-gray-900 bg-ubt-blue" />
        <time className="mb-1 block text-sm text-gray-400">
          {new Date(release.pubDate).toDateString()}
        </time>
        <a
          href={release.link}
          target="_blank"
          rel="noreferrer"
          className="text-lg font-semibold text-ubt-blue hover:underline"
        >
          {release.title}
        </a>
      </li>
    ))}
  </ol>
);

export default Timeline;
