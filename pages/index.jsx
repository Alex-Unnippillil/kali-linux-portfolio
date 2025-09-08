import Image from "next/image";
import { decode } from "blurhash";
import { PNG } from "pngjs";
import desktopsData from "../content/desktops.json";
import { baseMetadata } from "../lib/metadata";

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
  return (
    <main className="p-4">
      <h1 className="text-xl font-bold mb-4">Choose the desktop you prefer</h1>
      <div className="grid gap-4 sm:grid-cols-3">
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
            <p className="mt-2">{d.name}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
