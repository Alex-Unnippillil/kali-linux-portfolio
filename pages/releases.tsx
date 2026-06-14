import fs from 'fs';
import path from 'path';
import ReleaseTimeline from '../components/ReleaseTimeline';
import { parseReleases } from '../lib/releases';

interface Release {
  version: string;
  date: string;
  tags: string[];
}

interface Props {
  releases: Release[];
}

export async function getStaticProps() {
  const releases = parseReleases();
  const items = releases
    .map(
      (r) => `\n      <item>\n        <title>${r.version}</title>\n        <link>https://unnippillil.com/releases#v${r.version}</link>\n        <pubDate>${new Date(r.date).toUTCString()}</pubDate>\n        <description>${r.tags.join(', ')}</description>\n      </item>`,
    )
    .join('');
  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n<title>Kali Linux Portfolio Releases</title>\n<link>https://unnippillil.com/releases</link>\n<description>Release timeline for Kali Linux Portfolio</description>${items}\n</channel>\n</rss>`;
  fs.writeFileSync(path.join(process.cwd(), 'public', 'releases.xml'), rss);
  return { props: { releases } };
}

const ReleasesPage: React.FC<Props> = ({ releases }) => (
  <main className="max-w-3xl mx-auto p-4">
    <h1 className="text-2xl font-bold mb-4">Releases</h1>
    <p className="mb-6 text-sm">
      Subscribe to updates via{' '}
      <a href="/releases.xml" className="text-ubt-blue underline">
        RSS
      </a>
      .
    </p>
    <ReleaseTimeline releases={releases} />
  </main>
);

export default ReleasesPage;
