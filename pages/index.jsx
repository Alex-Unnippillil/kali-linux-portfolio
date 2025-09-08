import Image from "next/image";
import Link from "next/link";
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
      <section className="text-center py-16">
        <h1 className="text-3xl font-bold mb-4">Kali Linux Portfolio</h1>
        <p className="mb-8 text-lg text-gray-700">
          Explore and customize Kali across platforms.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/get-kali"
            aria-label="Get Kali Linux"
            className="px-6 py-3 text-lg rounded-md bg-blue-600 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
          >
            Get Kali
          </Link>
          <Link
            href="/docs"
            aria-label="Read the documentation"
            className="px-6 py-3 text-lg rounded-md bg-gray-200 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-500"
          >
            Docs
          </Link>
        </div>
      </section>
      <section>
        <h2 className="text-xl font-bold mb-4 text-center">
          Choose the desktop you prefer
        </h2>
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
      </section>
    </main>
  );
}
