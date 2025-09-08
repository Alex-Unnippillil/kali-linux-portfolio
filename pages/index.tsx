import dynamic from "next/dynamic";
import Image from "next/image";
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
const App: React.FC = () => {
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
      <section className="grid gap-8 py-12 text-center sm:grid-cols-3">
        <div className="flex flex-col items-center">
          <Image
            src="/themes/Yaru/status/about.svg"
            alt=""
            width={48}
            height={48}
          />
          <h2 className="mt-2 text-xl font-semibold">Platform Power</h2>
          <p className="text-sm">Offensive security built to stay ahead.</p>
        </div>
        <div className="flex flex-col items-center">
          <Image
            src="/themes/Yaru/status/network-wireless-signal-good-symbolic.svg"
            alt=""
            width={48}
            height={48}
          />
          <h2 className="mt-2 text-xl font-semibold">Kali Everywhere</h2>
          <p className="text-sm">Desktop, cloud & mobile ready.</p>
        </div>
        <div className="flex flex-col items-center">
          <Image
            src="/themes/Yaru/status/experience.svg"
            alt=""
            width={48}
            height={48}
          />
          <h2 className="mt-2 text-xl font-semibold">Customization</h2>
          <p className="text-sm">Tailor tools for your workflow.</p>
        </div>
      </section>
    </>
  );
};

export default App;
