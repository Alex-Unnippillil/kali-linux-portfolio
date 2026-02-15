import React from 'react';

interface Release {
  version: string;
  date: string;
  tags: string[];
}

interface Props {
  releases: Release[];
}

const ReleaseTimeline: React.FC<Props> = ({ releases }) => (
  <ol className="space-y-6">
    {releases.map((r) => {
      const anchor = `v${r.version}`;
      return (
        <li key={r.version} id={anchor} className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold">
            <a href={`#${anchor}`} className="text-ubt-blue underline">
              {r.version}
            </a>
            <span className="ml-2 text-sm text-gray-400">{r.date}</span>
          </h2>
          <ul className="flex flex-wrap gap-1 mt-2 text-xs md:text-sm text-gray-400">
            {r.tags.map((tag) => (
              <li key={tag}>#{tag}</li>
            ))}
          </ul>
        </li>
      );
    })}
  </ol>
);

export default ReleaseTimeline;
