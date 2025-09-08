import dynamic from "next/dynamic";
import { createMetadata } from "../lib/metadata";
import BetaBadge from "../components/BetaBadge";
import useSession from "../hooks/useSession";

export const metadata = createMetadata({
  title: "Alex Unnippillil's Portfolio",
  description: 'Personal portfolio showcasing security tools and demos.',
  path: '/',
});

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
    </>
  );
};

export default App;
