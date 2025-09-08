import Image from "next/image";
import { decode } from "blurhash";
import { PNG } from "pngjs";
import { useEffect, useState } from "react";
import type { GetStaticProps } from "next";
import desktopsData from "../content/desktops.json";
import { baseMetadata } from "../lib/metadata";
import ReleaseNotesModal from "../components/ReleaseNotesModal";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import PartnershipStrip from "../components/home/PartnershipStrip";

export const metadata = baseMetadata;

interface Desktop {
  name: string;
  image: string;
  blurhash: string;
  blurDataURL: string;
  default?: boolean;
}

function blurHashToDataURL(blurhash: string): string {
  const pixels = decode(blurhash, 32, 32);
  const png = new PNG({ width: 32, height: 32 });
  png.data = Buffer.from(pixels);
  return `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
}

export const getStaticProps: GetStaticProps<{ desktops: Desktop[] }> = async () => {
  const desktops = (desktopsData as Desktop[]).map((d) => ({
    ...d,
    blurDataURL: blurHashToDataURL(d.blurhash),
  }));
  return { props: { desktops } };
};

interface HomeProps {
  desktops: Desktop[];
}

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
        <PartnershipStrip />
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
