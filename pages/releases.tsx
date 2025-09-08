import { GetStaticProps } from 'next';
import { XMLParser } from 'fast-xml-parser';
import Timeline, { ReleaseItem } from '../components/releases/Timeline';

interface ReleasesPageProps {
  releases: ReleaseItem[];
}

export default function ReleasesPage({ releases }: ReleasesPageProps) {
  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Kali Linux Releases</h1>
      <Timeline releases={releases} />
    </main>
  );
}

export const getStaticProps: GetStaticProps<ReleasesPageProps> = async () => {
  const res = await fetch('https://www.kali.org/rss.xml');
  const xml = await res.text();
  const parser = new XMLParser();
  const parsed = parser.parse(xml);
  const items = Array.isArray(parsed.rss.channel.item)
    ? parsed.rss.channel.item
    : [parsed.rss.channel.item];
  const releases: ReleaseItem[] = items.map((item: any) => ({
    title: item.title as string,
    link: item.link as string,
    pubDate: item.pubDate as string,
  }));
  return {
    props: { releases },
    revalidate: 7200,
  };
};
