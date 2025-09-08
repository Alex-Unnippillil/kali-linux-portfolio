import { baseMetadata } from "../lib/metadata";

export const metadata = baseMetadata;

const Home = () => (
  <main className="min-h-screen flex flex-col items-center justify-center text-center bg-kali-hero">
    <h1 className="text-h1 font-bold mb-4">Kali Linux Portfolio</h1>
    <p className="mb-8 max-w-xl">
      Explore tools, documentation, and downloads for Kali Linux.
    </p>
    <div className="flex gap-4">
      <a
        href="https://www.kali.org/get-kali/"
        className="bg-ubt-blue text-white px-4 py-2 rounded"
      >
        Download
      </a>
      <a
        href="https://www.kali.org/docs/"
        className="bg-ubt-blue text-white px-4 py-2 rounded"
      >
        Documentation
      </a>
    </div>
  </main>
);

export default Home;
