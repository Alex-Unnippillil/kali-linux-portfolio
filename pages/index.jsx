import dynamic from "next/dynamic";
import { baseMetadata } from "../lib/metadata";
import BetaBadge from "../components/BetaBadge";
import useSession from "../hooks/useSession";

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
