import DesktopEnvs from "../components/home/DesktopEnvs";
import KaliEverywhere from "../components/home/KaliEverywhere";
import { baseMetadata } from "../lib/metadata";

export const metadata = baseMetadata;

export default function Home() {
  return (
    <main className="p-4 space-y-8">
      <section>
        <h1 className="text-xl font-bold mb-4">Kali Everywhere</h1>
        <KaliEverywhere />
      </section>
      <section>
        <h2 className="text-xl font-bold mb-4">Desktop Environments</h2>
        <DesktopEnvs />
      </section>
    </main>
  );
}

