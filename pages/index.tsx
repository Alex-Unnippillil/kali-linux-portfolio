import Image from "next/image";
import { useEffect, useState } from "react";
import type { GetStaticProps } from "next";
import { XMLParser } from "fast-xml-parser";
import desktopsData from "../content/desktops.json";
import { baseMetadata } from "../lib/metadata";
import ReleaseNotesModal from "../components/ReleaseNotesModal";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export const metadata = baseMetadata;

interface Desktop {
  name: string;
  image: string;
  blurhash: string;
  default?: boolean;
}

interface DesktopWithData extends Omit<Desktop, "blurhash"> {
  blurDataURL: string;
}

interface Post {
  title: string;
  link: string;
  date: string;
}

interface HomeProps {
  desktops: DesktopWithData[];
  posts: Post[];
}

async function blurHashToDataURL(blurhash: string) {
  const { decode } = await import("blurhash");
  const { PNG } = await import("pngjs");
  const pixels = decode(blurhash, 32, 32);
  const png = new PNG({ width: 32, height: 32 });
  // Convert the Uint8ClampedArray returned by decode into a Buffer-friendly Uint8Array.
  png.data = Buffer.from(Uint8Array.from(pixels));
  return `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  const desktops = await Promise.all(
    (desktopsData as Desktop[]).map(async (d) => ({
      ...d,
      blurDataURL: await blurHashToDataURL(d.blurhash),
    }))
  );

  const rssRes = await fetch("https://www.kali.org/rss.xml");
  const rssText = await rssRes.text();
  const parser = new XMLParser();
  const rss = parser.parse(rssText);
  const items = rss?.rss?.channel?.item ?? [];
  const arr = Array.isArray(items) ? items : [items];
  const posts: Post[] = arr
    .filter((i) => i && i.title)
    .map((i: any) => ({
      title: i.title,
      link: i.link,
      date: i.pubDate,
    }));

  return { props: { desktops, posts }, revalidate: 7200 };
};

export default function Home({ desktops }: HomeProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <>
      <Header />
      <main className="p-4">
        <h1 className="mb-4 text-2xl font-bold sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl">
          Choose the desktop you prefer
        </h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {desktops.map((d) => (
            <div
              key={d.name}
              className="relative text-center"
              aria-label={
                d.default
                  ? `${d.name} desktop environment (default)`
                  : `${d.name} desktop environment`
              }
            >
              {d.default && (
                <span
                  aria-hidden="true"
                  className="absolute right-2 top-2 rounded bg-muted px-1.5 py-0.5 text-xs text-text"
                >
                  Default
                </span>
              )}
              <Image
                src={d.image}
                alt={d.name}
                width={320}
                height={200}
                placeholder="blur"
                blurDataURL={d.blurDataURL}
                className="rounded"
              />
              <p className="mt-2 text-sm sm:text-base md:text-lg">{d.name}</p>
            </div>
          ))}
        </div>
        <ReleaseNotesModal isOpen={open} onClose={() => setOpen(false)} />
      </main>
      <Footer />
    </>
  );
}
