import { useState } from 'react';
import { GetStaticProps } from 'next';
import { ReleaseMeta, getReleases } from '../../lib/releases';

interface Props {
  releases: ReleaseMeta[];
}

export default function ReleasesPage({ releases }: Props) {
  const [filter, setFilter] = useState<'all' | 'lts' | 'eol'>('all');
  const filtered = releases.filter((r) => {
    if (filter === 'lts') return r.lts;
    if (filter === 'eol') return Boolean(r.eol);
    return true;
  });

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Releases</h1>
      <select
        className="border p-1"
        value={filter}
        onChange={(e) => setFilter(e.target.value as 'all' | 'lts' | 'eol')}
      >
        <option value="all">All</option>
        <option value="lts">LTS</option>
        <option value="eol">EOL</option>
      </select>
      <ul className="space-y-2">
        {filtered.map((release) => (
          <li key={release.slug} id={release.slug} className="scroll-mt-16">
            <a href={`#${release.slug}`} className="font-medium">
              {release.title}
            </a>
            {release.lts && (
              <span className="ml-2 rounded bg-green-200 px-2 py-0.5 text-xs text-green-800">
                LTS
              </span>
            )}
            {release.eol && (
              <span className="ml-1 rounded bg-red-200 px-2 py-0.5 text-xs text-red-800">
                EOL {release.eol}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const getStaticProps: GetStaticProps<Props> = async () => {
  const releases = getReleases();
  return { props: { releases } };
};
