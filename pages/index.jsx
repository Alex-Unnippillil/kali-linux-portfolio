import dynamic from "next/dynamic";
import { baseMetadata } from "../lib/metadata";
import BetaBadge from "../components/BetaBadge";
import useSession from "../hooks/useSession";
import KaliBlogPosts from "../components/KaliBlogPosts";

export const metadata = baseMetadata;

const Ubuntu = dynamic(
  () =>
    import("../components/screen/ubuntu").catch((err) => {
      console.error("Failed to load Ubuntu component", err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading Ubuntu...</p>,
  },
);
const InstallButton = dynamic(
  () =>
    import("../components/InstallButton").catch((err) => {
      console.error("Failed to load InstallButton component", err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading install options...</p>,
  },
);

/**
 * @returns {JSX.Element}
 */
const App = () => {
  const { session, setSession, resetSession } = useSession();
  return (
    <>
      <a href="#window-area" className="sr-only focus:not-sr-only">
        Skip to content
      </a>
      <Ubuntu
        session={session}
        setSession={setSession}
        resetSession={resetSession}
      />
      <BetaBadge />
      <InstallButton />
      <KaliBlogPosts />
      <footer className="mt-8 text-center text-xs text-gray-400">
        <a
          href="https://www.kali.org/rss.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          Kali Blog RSS
        </a>
      </footer>
    </>
  );
};

export default App;
