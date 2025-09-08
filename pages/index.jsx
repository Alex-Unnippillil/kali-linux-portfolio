import Image from "next/image";
import { decode } from "blurhash";
import { PNG } from "pngjs";
import { useEffect, useState } from "react";
import desktopsData from "../content/desktops.json";
import { baseMetadata } from "../lib/metadata";
import ReleaseNotesModal from "../components/ReleaseNotesModal";

export const metadata = baseMetadata;

function blurHashToDataURL(blurhash) {
  const pixels = decode(blurhash, 32, 32);
  const png = new PNG({ width: 32, height: 32 });
  png.data = Buffer.from(pixels);
  return `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
}

export async function getStaticProps() {
  const desktops = desktopsData.map((d) => ({
    ...d,
    blurDataURL: blurHashToDataURL(d.blurhash),
  }));
  return { props: { desktops } };
}

/**
 * @param {{ desktops: { name: string; image: string; blurDataURL: string }[] }} props
 * @returns {JSX.Element}
 */
export default function Home({ desktops }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl">Choose the desktop you prefer</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {desktops.map((d) => (
          <div key={d.name} className="text-center">
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
  );
}
